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
  createDataSourceSchema,
  updateDataSourceSchema,
} from '@autobi/contracts';
import { ForbiddenError, NotFoundError } from '@autobi/shared';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { PrismaService } from '../core/prisma.service.js';
import { DataSourcesService } from './data-sources.service.js';

@Controller('data-sources')
@UseGuards(AuthGuard)
export class DataSourcesController {
  constructor(
    private readonly dataSources: DataSourcesService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertMembership(
    userId: string,
    workspaceId: string,
    write = false,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw new NotFoundError('Workspace not found');
    if (write && membership.role === 'Viewer') {
      throw new ForbiddenError('Viewers cannot modify data sources');
    }
    return membership;
  }

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId);
    const items = await this.dataSources.list(workspaceId);
    return { dataSources: items };
  }

  @Get('jobs/:jobId')
  async jobStatus(@Param('jobId') jobId: string) {
    return this.dataSources.getJobStatus(jobId);
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createDataSourceSchema))
    body: {
      workspaceId: string;
      name: string;
      type: 'postgresql' | 'mysql' | 'mariadb' | 'sqlserver';
      config: {
        host: string;
        port: number;
        database: string;
        username: string;
        password: string;
        ssl?: boolean;
        schema?: string;
        connectionTimeoutMs?: number;
      };
    },
  ) {
    await this.assertMembership(req.userId, body.workspaceId, true);
    const dataSource = await this.dataSources.create(body);
    return { dataSource };
  }

  @Get(':id')
  async get(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId);
    const dataSource = await this.dataSources.get(workspaceId, id);
    return { dataSource };
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(updateDataSourceSchema))
    body: {
      name?: string;
      config?: {
        host: string;
        port: number;
        database: string;
        username: string;
        password: string;
        ssl?: boolean;
        schema?: string;
        connectionTimeoutMs?: number;
      };
    },
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId, true);
    const dataSource = await this.dataSources.update(workspaceId, id, body);
    return { dataSource };
  }

  @Delete(':id')
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId, true);
    return this.dataSources.delete(workspaceId, id);
  }

  @Post(':id/test')
  async test(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId, true);
    const result = await this.dataSources.test(workspaceId, id);
    return { result };
  }

  @Post(':id/introspect')
  async introspect(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId, true);
    const job = await this.dataSources.introspect(workspaceId, id);
    return job;
  }

  @Get(':id/schema')
  async schema(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId);
    return this.dataSources.getSchema(workspaceId, id);
  }

  @Get(':id/schema/tables')
  async tables(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId);
    return this.dataSources.getTables(workspaceId, id);
  }
}
