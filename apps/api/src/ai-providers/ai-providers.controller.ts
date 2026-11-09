import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { saveAiProviderConfigSchema, testAiProviderSchema } from '@autobi/contracts';
import { ForbiddenError, NotFoundError } from '@autobi/shared';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { PrismaService } from '../core/prisma.service.js';
import { AiProvidersService } from './ai-providers.service.js';

@Controller('ai/providers')
@UseGuards(AuthGuard)
export class AiProvidersController {
  constructor(
    private readonly aiProviders: AiProvidersService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertMembership(userId: string, workspaceId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw new NotFoundError('Workspace not found');
    if (membership.role === 'Viewer') {
      throw new ForbiddenError('Viewers cannot manage AI providers');
    }
    return membership;
  }

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId?: string,
  ) {
    const providers = this.aiProviders.listAvailable();
    if (!workspaceId) return { providers, configs: [] };
    await this.assertMembership(req.userId, workspaceId);
    const configs = await this.aiProviders.listConfigs(workspaceId);
    return { providers, configs };
  }

  @Post('config')
  async saveConfig(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(saveAiProviderConfigSchema))
    body: {
      workspaceId: string;
      provider: 'openai' | 'openrouter';
      apiKey: string;
      model: string;
    },
  ) {
    await this.assertMembership(req.userId, body.workspaceId);
    const config = await this.aiProviders.saveConfig(body);
    return { config };
  }

  @Post('test')
  async test(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(testAiProviderSchema))
    body: {
      workspaceId: string;
      provider: 'openai' | 'openrouter';
      apiKey?: string;
      model: string;
      configId?: string;
    },
  ) {
    await this.assertMembership(req.userId, body.workspaceId);
    const result = await this.aiProviders.test(body);
    return { result };
  }

  @Delete('config/:id')
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId);
    return this.aiProviders.deleteConfig(workspaceId, id);
  }
}
