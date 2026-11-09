import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createQuerySchema, updateQuerySchema, type QueryPlanInput } from '@autobi/contracts';
import { ForbiddenError, NotFoundError } from '@autobi/shared';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { PrismaService } from '../core/prisma.service.js';
import { QueriesService } from './queries.service.js';

@Controller('queries')
@UseGuards(AuthGuard)
export class QueriesController {
  constructor(
    private readonly queries: QueriesService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertMembership(userId: string, workspaceId: string, write = false) {
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw new NotFoundError('Workspace not found');
    if (write && membership.role === 'Viewer') {
      throw new ForbiddenError('Viewers cannot modify queries');
    }
    return membership;
  }

  private async workspaceOf(id: string) {
    const q = await this.prisma.queryDefinition.findUnique({ where: { id } });
    if (!q) throw new NotFoundError('Query not found');
    return q.workspaceId;
  }

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId);
    const items = await this.queries.list(workspaceId);
    return { queries: items };
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createQuerySchema))
    body: {
      workspaceId: string;
      name: string;
      semanticModelId?: string;
      plan: QueryPlanInput;
    },
  ) {
    await this.assertMembership(req.userId, body.workspaceId, true);
    const query = await this.queries.create(body);
    return { query };
  }

  @Get(':id')
  async get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspaceId = await this.workspaceOf(id);
    await this.assertMembership(req.userId, workspaceId);
    return this.queries.get(workspaceId, id);
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateQuerySchema))
    body: {
      name?: string;
      semanticModelId?: string | null;
      plan?: QueryPlanInput;
    },
  ) {
    const workspaceId = await this.workspaceOf(id);
    await this.assertMembership(req.userId, workspaceId, true);
    const query = await this.queries.update(workspaceId, id, body);
    return { query };
  }

  @Delete(':id')
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspaceId = await this.workspaceOf(id);
    await this.assertMembership(req.userId, workspaceId, true);
    return this.queries.delete(workspaceId, id);
  }

  @Post(':id/compile')
  async compile(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspaceId = await this.workspaceOf(id);
    await this.assertMembership(req.userId, workspaceId, true);
    return this.queries.compile(workspaceId, id);
  }

  @Post(':id/execute')
  async execute(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspaceId = await this.workspaceOf(id);
    await this.assertMembership(req.userId, workspaceId, true);
    return this.queries.execute(workspaceId, id);
  }
}
