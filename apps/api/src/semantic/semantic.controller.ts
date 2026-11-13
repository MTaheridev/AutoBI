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
import {
  createDimensionSchema,
  createEntitySchema,
  createMetricSchema,
  bulkSemanticStatusSchema,
  createRelationshipSchema,
  createSemanticModelSchema,
  proposeSemanticModelSchema,
  updateSemanticStatusSchema,
} from '@autobi/contracts';
import { ForbiddenError, NotFoundError } from '@autobi/shared';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { PrismaService } from '../core/prisma.service.js';
import { SemanticService } from './semantic.service.js';
import { assertWorkspaceRole } from '../common/membership.js';
import { WorkspaceThrottleService } from '../core/workspace-throttle.service.js';

@Controller('semantic-models')
@UseGuards(AuthGuard)
export class SemanticController {
  constructor(
    private readonly semantic: SemanticService,
    private readonly prisma: PrismaService,
    private readonly throttle: WorkspaceThrottleService,
  ) {}

  private assertMembership(userId: string, workspaceId: string, write = false) {
    // Approve/reject and propose require Member+
    return assertWorkspaceRole(
      this.prisma,
      userId,
      workspaceId,
      write ? 'Member' : 'Viewer',
    );
  }

  private async workspaceOfModel(id: string) {
    const model = await this.prisma.semanticModel.findUnique({ where: { id } });
    if (!model) throw new NotFoundError('Semantic model not found');
    return model.workspaceId;
  }

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId);
    const models = await this.semantic.list(workspaceId);
    return { models };
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createSemanticModelSchema))
    body: {
      workspaceId: string;
      dataSourceId: string;
      name: string;
      description?: string;
    },
  ) {
    await this.assertMembership(req.userId, body.workspaceId, true);
    const model = await this.semantic.create(body);
    return { model };
  }

  @Get(':id')
  async get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId);
    return this.semantic.get(workspaceId, id);
  }

  @Delete(':id')
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    return this.semantic.delete(workspaceId, id);
  }

  @Post(':id/propose')
  async propose(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(proposeSemanticModelSchema))
    body: { provider?: 'openai' | 'openrouter'; useAi?: boolean } = { useAi: true },
  ) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    await this.throttle.assert(workspaceId, 'semanticPropose', req.userId);
    return this.semantic.propose(workspaceId, id, body ?? { useAi: true });
  }

  @Post(':id/entities')
  async createEntity(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createEntitySchema))
    body: { name: string; description?: string; tableRef: string },
  ) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    const entity = await this.semantic.createEntity(workspaceId, id, body);
    return { entity };
  }

  @Post(':id/metrics')
  async createMetric(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createMetricSchema))
    body: {
      name: string;
      description?: string;
      expression: string;
      aggregation: string;
      entityName?: string;
    },
  ) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    const metric = await this.semantic.createMetric(workspaceId, id, body);
    return { metric };
  }

  @Post(':id/dimensions')
  async createDimension(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createDimensionSchema))
    body: { name: string; description?: string; field: string; entityName?: string },
  ) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    const dimension = await this.semantic.createDimension(workspaceId, id, body);
    return { dimension };
  }

  @Post(':id/relationships')
  async createRelationship(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createRelationshipSchema))
    body: {
      name?: string;
      fromEntity: string;
      toEntity: string;
      fromField: string;
      toField: string;
    },
  ) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    const relationship = await this.semantic.createRelationship(workspaceId, id, body);
    return { relationship };
  }

  @Patch(':id/entities/:itemId/status')
  async entityStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateSemanticStatusSchema)) body: { status: 'Proposed' | 'Approved' | 'Rejected' },
  ) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    const entity = await this.semantic.updateEntityStatus(
      workspaceId,
      id,
      itemId,
      body.status,
      req.userId,
    );
    return { entity };
  }

  @Patch(':id/metrics/:itemId/status')
  async metricStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateSemanticStatusSchema)) body: { status: 'Proposed' | 'Approved' | 'Rejected' },
  ) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    const metric = await this.semantic.updateMetricStatus(
      workspaceId,
      id,
      itemId,
      body.status,
      req.userId,
    );
    return { metric };
  }

  @Patch(':id/dimensions/:itemId/status')
  async dimensionStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateSemanticStatusSchema)) body: { status: 'Proposed' | 'Approved' | 'Rejected' },
  ) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    const dimension = await this.semantic.updateDimensionStatus(
      workspaceId,
      id,
      itemId,
      body.status,
      req.userId,
    );
    return { dimension };
  }

  @Patch(':id/relationships/:itemId/status')
  async relationshipStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateSemanticStatusSchema)) body: { status: 'Proposed' | 'Approved' | 'Rejected' },
  ) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    const relationship = await this.semantic.updateRelationshipStatus(
      workspaceId,
      id,
      itemId,
      body.status,
      req.userId,
    );
    return { relationship };
  }

  @Post(':id/bulk-status')
  async bulkStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bulkSemanticStatusSchema))
    body: {
      kind: 'entities' | 'metrics' | 'dimensions' | 'relationships';
      fromStatus: 'Proposed' | 'Approved' | 'Rejected';
      toStatus: 'Proposed' | 'Approved' | 'Rejected';
    },
  ) {
    const workspaceId = await this.workspaceOfModel(id);
    await this.assertMembership(req.userId, workspaceId, true);
    return this.semantic.bulkSetStatus(
      workspaceId,
      id,
      body.kind,
      body.fromStatus,
      body.toStatus,
    );
  }
}
