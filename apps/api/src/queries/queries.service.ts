import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  connectorRegistry,
  registerBuiltinConnectors,
  type ConnectionConfig,
  type ConnectorType,
} from '@autobi/connectors';
import {
  buildCompiledQuery,
  queryPlanSchema,
  type QueryPlan,
} from '@autobi/query-engine';
import { AppError, NotFoundError } from '@autobi/shared';
import type { Prisma } from '@autobi/database';
import { PrismaService } from '../core/prisma.service.js';
import { EncryptionService } from '../core/encryption.service.js';

@Injectable()
export class QueriesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  onModuleInit() {
    registerBuiltinConnectors();
  }

  private toDto(q: {
    id: string;
    workspaceId: string;
    dataSourceId: string;
    semanticModelId: string | null;
    name: string;
    plan: unknown;
    compiledSql: string | null;
    dialect: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: q.id,
      workspaceId: q.workspaceId,
      dataSourceId: q.dataSourceId,
      semanticModelId: q.semanticModelId,
      name: q.name,
      plan: q.plan,
      compiledSql: q.compiledSql,
      dialect: q.dialect,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    };
  }

  private async buildContext(workspaceId: string, plan: QueryPlan, semanticModelId?: string | null) {
    const ds = await this.prisma.dataSource.findFirst({
      where: { id: plan.dataSourceId, workspaceId },
    });
    if (!ds) throw new NotFoundError('Data source not found');

    const snapshot = await this.prisma.schemaSnapshot.findFirst({
      where: { dataSourceId: ds.id },
      orderBy: { version: 'desc' },
    });
    if (!snapshot) {
      throw new AppError(
        'No schema snapshot found. Run introspection first.',
        'SCHEMA_REQUIRED',
        400,
      );
    }

    const metadata = snapshot.metadata as unknown as {
      tables: Array<{
        schema: string;
        name: string;
        columns: Array<{ name: string; dataType?: string }>;
      }>;
    };

    let metrics: Array<{
      id: string;
      name: string;
      expression: string;
      aggregation: string;
      status: string;
    }> = [];
    let dimensions: Array<{
      id: string;
      name: string;
      field: string;
      status: string;
    }> = [];

    if (semanticModelId) {
      const model = await this.prisma.semanticModel.findFirst({
        where: { id: semanticModelId, workspaceId, dataSourceId: ds.id },
        include: { metrics: true, dimensions: true },
      });
      if (!model) throw new NotFoundError('Semantic model not found');
      metrics = model.metrics.map((m) => ({
        id: m.id,
        name: m.name,
        expression: m.expression,
        aggregation: m.aggregation,
        status: m.status,
      }));
      dimensions = model.dimensions.map((d) => ({
        id: d.id,
        name: d.name,
        field: d.field,
        status: d.status,
      }));
    }

    return {
      dataSource: ds,
      compileContext: {
        dialect: ds.type as ConnectorType,
        tables: metadata.tables ?? [],
        metrics,
        dimensions,
        preferApprovedSemantics: true,
      },
    };
  }

  async create(input: {
    workspaceId: string;
    name: string;
    semanticModelId?: string;
    plan: QueryPlan;
  }) {
    const plan = queryPlanSchema.parse(input.plan);
    const { dataSource, compileContext } = await this.buildContext(
      input.workspaceId,
      plan,
      input.semanticModelId,
    );
    const compiled = buildCompiledQuery(plan, compileContext);

    const created = await this.prisma.queryDefinition.create({
      data: {
        workspaceId: input.workspaceId,
        dataSourceId: dataSource.id,
        semanticModelId: input.semanticModelId,
        name: input.name,
        plan: plan as unknown as Prisma.InputJsonValue,
        compiledSql: compiled.sql,
        dialect: compiled.dialect,
      },
    });
    return this.toDto(created);
  }

  async list(workspaceId: string) {
    const items = await this.prisma.queryDefinition.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
    });
    return items.map((q) => this.toDto(q));
  }

  async get(workspaceId: string, id: string) {
    const q = await this.prisma.queryDefinition.findFirst({
      where: { id, workspaceId },
      include: {
        runs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!q) throw new NotFoundError('Query not found');
    return {
      query: this.toDto(q),
      runs: q.runs.map((r) => ({
        id: r.id,
        status: r.status,
        durationMs: r.durationMs,
        rowCount: r.rowCount,
        truncated: r.truncated,
        error: r.error,
        resultPreview: r.resultPreview,
        compiledSql: r.compiledSql,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async update(
    workspaceId: string,
    id: string,
    input: { name?: string; semanticModelId?: string | null; plan?: QueryPlan },
  ) {
    const existing = await this.prisma.queryDefinition.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundError('Query not found');

    const plan = input.plan
      ? queryPlanSchema.parse(input.plan)
      : (existing.plan as unknown as QueryPlan);
    const semanticModelId =
      input.semanticModelId === undefined ? existing.semanticModelId : input.semanticModelId;

    const { dataSource, compileContext } = await this.buildContext(
      workspaceId,
      { ...plan, dataSourceId: plan.dataSourceId || existing.dataSourceId },
      semanticModelId,
    );
    const compiled = buildCompiledQuery(
      { ...plan, dataSourceId: dataSource.id },
      compileContext,
    );

    const updated = await this.prisma.queryDefinition.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        semanticModelId,
        plan: plan as unknown as Prisma.InputJsonValue,
        compiledSql: compiled.sql,
        dialect: compiled.dialect,
        dataSourceId: dataSource.id,
      },
    });
    return this.toDto(updated);
  }

  async delete(workspaceId: string, id: string) {
    const existing = await this.prisma.queryDefinition.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundError('Query not found');
    await this.prisma.queryDefinition.delete({ where: { id } });
    return { ok: true };
  }

  async compile(workspaceId: string, id: string) {
    const existing = await this.prisma.queryDefinition.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundError('Query not found');
    const plan = queryPlanSchema.parse(existing.plan);
    const { compileContext } = await this.buildContext(
      workspaceId,
      plan,
      existing.semanticModelId,
    );
    const compiled = buildCompiledQuery(plan, compileContext);
    const updated = await this.prisma.queryDefinition.update({
      where: { id },
      data: { compiledSql: compiled.sql, dialect: compiled.dialect },
    });
    return {
      query: this.toDto(updated),
      compiled: { sql: compiled.sql, paramCount: compiled.params.length, dialect: compiled.dialect },
    };
  }

  async execute(workspaceId: string, id: string) {
    const existing = await this.prisma.queryDefinition.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundError('Query not found');

    const plan = queryPlanSchema.parse(existing.plan);
    const { dataSource, compileContext } = await this.buildContext(
      workspaceId,
      plan,
      existing.semanticModelId,
    );
    const compiled = buildCompiledQuery(plan, compileContext);

    const run = await this.prisma.queryRun.create({
      data: {
        queryDefinitionId: id,
        status: 'running',
        compiledSql: compiled.sql,
      },
    });

    const started = Date.now();
    const connector = connectorRegistry.create(dataSource.type);
    const config = JSON.parse(
      this.encryption.decrypt(dataSource.encryptedConfig),
    ) as ConnectionConfig;

    try {
      await connector.connect(config);
      const result = await connector.executeQuery(
        { sql: compiled.sql, params: compiled.params },
        { maxRows: plan.limit, timeoutMs: 30_000 },
      );

      const preview = {
        columns: result.columns,
        rows: result.rows.slice(0, 100),
        rowCount: result.rowCount,
        truncated: result.truncated || result.rowCount > 100,
      };

      const updated = await this.prisma.queryRun.update({
        where: { id: run.id },
        data: {
          status: 'succeeded',
          durationMs: Date.now() - started,
          rowCount: result.rowCount,
          truncated: preview.truncated,
          resultPreview: preview as unknown as Prisma.InputJsonValue,
        },
      });

      await this.prisma.queryDefinition.update({
        where: { id },
        data: { compiledSql: compiled.sql, dialect: compiled.dialect },
      });

      return {
        run: {
          id: updated.id,
          status: updated.status,
          durationMs: updated.durationMs,
          rowCount: updated.rowCount,
          truncated: updated.truncated,
          compiledSql: updated.compiledSql,
          createdAt: updated.createdAt.toISOString(),
        },
        result: preview,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Query execution failed';
      await this.prisma.queryRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          durationMs: Date.now() - started,
          error: message,
        },
      });
      throw new AppError(message, 'QUERY_EXECUTION_FAILED', 502);
    } finally {
      await connector.close();
    }
  }
}
