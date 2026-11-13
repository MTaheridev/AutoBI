import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  agentAnswerStreamSchema,
  agentChatStreamSchema,
  createAgentConversationSchema,
} from '@autobi/contracts';
import { ForbiddenError } from '@autobi/shared';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { PrismaService } from '../core/prisma.service.js';
import { assertWorkspaceRole } from '../common/membership.js';
import { AgentService } from './agent.service.js';

@Controller('agent')
@UseGuards(AuthGuard)
export class AgentController {
  constructor(
    private readonly agent: AgentService,
    private readonly prisma: PrismaService,
  ) {}

  private membership(userId: string, workspaceId: string, write = false) {
    return assertWorkspaceRole(
      this.prisma,
      userId,
      workspaceId,
      write ? 'Member' : 'Viewer',
    );
  }

  @Get('conversations')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.membership(req.userId, workspaceId);
    const conversations = await this.agent.listConversations(workspaceId);
    return { conversations };
  }

  @Post('conversations')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createAgentConversationSchema))
    body: {
      workspaceId: string;
      title?: string;
      dataSourceId?: string;
    },
  ) {
    await this.membership(req.userId, body.workspaceId, true);
    const conversation = await this.agent.createConversation(body);
    return { conversation };
  }

  @Get('conversations/:id')
  async get(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.membership(req.userId, workspaceId);
    return this.agent.getConversation(workspaceId, id);
  }

  @Delete('conversations/:id')
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.membership(req.userId, workspaceId, true);
    return this.agent.deleteConversation(workspaceId, id);
  }

  @Post('chat/stream')
  async chatStream(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Body(new ZodValidationPipe(agentChatStreamSchema))
    body: {
      workspaceId: string;
      conversationId?: string;
      message: string;
      provider?: 'openai' | 'openrouter' | 'gemini';
    },
  ) {
    await this.membership(req.userId, body.workspaceId, true);
    await this.writeSse(res, this.agent.streamChat({
      workspaceId: body.workspaceId,
      userId: req.userId,
      conversationId: body.conversationId,
      message: body.message,
      provider: body.provider,
    }));
  }

  @Post('conversations/:id/answer')
  async answerStream(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(agentAnswerStreamSchema))
    body: {
      workspaceId: string;
      conversationId: string;
      askId: string;
      selectedOptionIds: string[];
      freeText?: string;
      provider?: 'openai' | 'openrouter' | 'gemini';
    },
  ) {
    if (body.conversationId !== id) {
      throw new ForbiddenError('conversationId mismatch');
    }
    await this.membership(req.userId, body.workspaceId, true);
    await this.writeSse(
      res,
      this.agent.streamAnswer({
        workspaceId: body.workspaceId,
        userId: req.userId,
        conversationId: body.conversationId,
        askId: body.askId,
        selectedOptionIds: body.selectedOptionIds,
        freeText: body.freeText,
        provider: body.provider,
      }),
    );
  }

  private async writeSse(
    res: Response,
    events: AsyncGenerator<{ type: string }>,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const write = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      for await (const event of events) {
        write(event);
        if (
          event.type === 'done' ||
          event.type === 'error' ||
          event.type === 'awaiting_input'
        ) {
          break;
        }
      }
    } catch (error) {
      write({
        type: 'error',
        message: error instanceof Error ? error.message : 'Agent stream failed',
      });
    } finally {
      res.end();
    }
  }
}
