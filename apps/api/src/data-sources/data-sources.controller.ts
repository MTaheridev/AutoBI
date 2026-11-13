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
  testDataSourceSchema,
  updateDataSourceSchema,
} from '@autobi/contracts';
import { ForbiddenError } from '@autobi/shared';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { PrismaService } from '../core/prisma.service.js';
import { DataSourcesService } from './data-sources.service.js';
import { assertWorkspaceRole } from '../common/membership.js';

@Controller('data-sources')
@UseGuards(AuthGuard)
export class DataSourcesController {
  constructor(
    private readonly dataSources: DataSourcesService,
    private readonly prisma: PrismaService,
  ) {}

  private assertMembership(userId: string, workspaceId: string, write = false) {
    // Credentialed DS changes require Admin+; reads allow Viewer.
    return assertWorkspaceRole(
      this.prisma,
      userId,
      workspaceId,
      write ? 'Admin' : 'Viewer',
    );
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
  async jobStatus(
    @Req() req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new ForbiddenError('workspaceId required');
    await this.assertMembership(req.userId, workspaceId);
    return this.dataSources.getJobStatus(workspaceId, jobId);
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
    const dataSource = await this.dataSources.create({ ...body, actorId: req.userId });
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
    const dataSource = await this.dataSources.update(workspaceId, id, body, req.userId);
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
    return this.dataSources.delete(workspaceId, id, req.userId);
  }

  /** Ephemeral test with unsaved credentials — must be declared before `:id/test`. */
  @Post('test')
  async testConfig(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(testDataSourceSchema))
    body: {
      workspaceId: string;
      type: 'postgresql' | 'mysql' | 'mariadb' | 'sqlserver';
      dataSourceId?: string;
      config: {
        host: string;
        port: number;
        database: string;
        username: string;
        password?: string;
        ssl?: boolean;
        schema?: string;
        connectionTimeoutMs?: number;
      };
    },
  ) {
    await this.assertMembership(req.userId, body.workspaceId, true);
    const result = await this.dataSources.testConfigInput(body);
    return { result };
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
