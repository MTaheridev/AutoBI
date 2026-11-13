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
  createDashboardSchema,
  editDashboardSchema,
  generateDashboardSchema,
  updateDashboardSchema,
  type DashboardSpecInput,
} from '@autobi/contracts';
import { ForbiddenError, NotFoundError } from '@autobi/shared';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { PrismaService } from '../core/prisma.service.js';
import { DashboardsService } from './dashboards.service.js';
import { assertWorkspaceRole } from '../common/membership.js';
import { WorkspaceThrottleService } from '../core/workspace-throttle.service.js';

@Controller()
@UseGuards(AuthGuard)
export class DashboardsController {
  constructor(
    private readonly dashboards: DashboardsService,
    private readonly prisma: PrismaService,
    private readonly throttle: WorkspaceThrottleService,
  ) {}

  private assertMembership(userId: string, workspaceId: string, write = false) {
    return assertWorkspaceRole(
      this.prisma,
      userId,
      workspaceId,
      write ? 'Member' : 'Viewer',
    );
  }

  private async workspaceOf(id: string) {
    const d = await this.prisma.dashboard.findUnique({ where: { id } });
    if (!d) throw new NotFoundError('Dashboard not found');
    return d.workspaceId;
  }

  @Get('dashboards')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId);
    const items = await this.dashboards.list(workspaceId);
    return { dashboards: items };
  }

  @Post('dashboards')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createDashboardSchema))
    body: {
      workspaceId: string;
      name: string;
      description?: string;
      spec?: DashboardSpecInput;
    },
  ) {
    await this.assertMembership(req.userId, body.workspaceId, true);
    const dashboard = await this.dashboards.create(body);
    return { dashboard };
  }

  @Get('dashboards/:id')
  async get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspaceId = await this.workspaceOf(id);
    await this.assertMembership(req.userId, workspaceId);
    return this.dashboards.get(workspaceId, id);
  }

  @Patch('dashboards/:id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDashboardSchema))
    body: {
      name?: string;
      description?: string | null;
      spec?: DashboardSpecInput;
    },
  ) {
    const workspaceId = await this.workspaceOf(id);
    await this.assertMembership(req.userId, workspaceId, true);
    return this.dashboards.update(workspaceId, id, body);
  }

  @Delete('dashboards/:id')
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspaceId = await this.workspaceOf(id);
    await this.assertMembership(req.userId, workspaceId, true);
    return this.dashboards.delete(workspaceId, id);
  }

  @Get('dashboards/:id/versions')
  async versions(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const workspaceId = await this.workspaceOf(id);
    await this.assertMembership(req.userId, workspaceId);
    const detail = await this.dashboards.get(workspaceId, id);
    return { versions: detail.versions };
  }

  @Get('dashboards/:id/versions/:version')
  async version(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    const workspaceId = await this.workspaceOf(id);
    await this.assertMembership(req.userId, workspaceId);
    return this.dashboards.getVersion(workspaceId, id, Number(version));
  }

  @Post('ai/generate-dashboard')
  async generate(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(generateDashboardSchema))
    body: {
      workspaceId: string;
      dataSourceId: string;
      semanticModelId?: string;
      prompt: string;
      useAi?: boolean;
      provider?: 'openai' | 'openrouter';
    },
  ) {
    await this.assertMembership(req.userId, body.workspaceId, true);
    await this.throttle.assert(body.workspaceId, 'aiDashboard', req.userId);
    return this.dashboards.generate(body);
  }

  @Post('ai/edit-dashboard')
  async edit(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(editDashboardSchema))
    body: {
      workspaceId: string;
      dashboardId: string;
      prompt: string;
      useAi?: boolean;
      provider?: 'openai' | 'openrouter';
    },
  ) {
    await this.assertMembership(req.userId, body.workspaceId, true);
    await this.throttle.assert(body.workspaceId, 'aiDashboard', req.userId);
    return this.dashboards.edit(body);
  }
}
