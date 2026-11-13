import { randomUUID } from 'node:crypto';
import type { AgentToolDefinition } from '@autobi/ai';
import type { ConnectorType } from '@autobi/connectors';
import { queryPlanSchema } from '@autobi/query-engine';
import { dashboardSpecSchema } from '@autobi/dashboard-engine';
import { AppError, ValidationError } from '@autobi/shared';
import type { DataSourcesService } from '../data-sources/data-sources.service.js';
import type { SemanticService } from '../semantic/semantic.service.js';
import type { QueriesService } from '../queries/queries.service.js';
import type { DashboardsService } from '../dashboards/dashboards.service.js';
import type { PrismaService } from '../core/prisma.service.js';
import { assertWorkspaceRole } from '../common/membership.js';
import { redactSecrets } from './redact.js';

export type AgentToolContext = {
  workspaceId: string;
  userId: string;
  prisma: PrismaService;
  dataSources: DataSourcesService;
  semantic: SemanticService;
  queries: QueriesService;
  dashboards: DashboardsService;
  /** Data sources grounded via get_to_know / sample in this conversation. */
  groundedDataSourceIds: Set<string>;
};

export type AgentAskPayload = {
  askId: string;
  question: string;
  options: Array<{ id: string; label: string }>;
  allowMultiple: boolean;
  toolCallId?: string;
};

export type AgentToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  /** When set, the orchestrator pauses the loop for selectable user input. */
  pauseAsk?: AgentAskPayload;
  artifacts?: Array<{
    type: 'dashboard' | 'query' | 'data_source' | 'semantic_model';
    id: string;
    label?: string;
  }>;
};

export const AGENT_TOOL_DEFINITIONS: AgentToolDefinition[] = [
  {
    name: 'get_workspace_overview',
    description:
      'List data sources, schema snapshot status, semantic models, queries, and dashboards in the workspace.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'test_data_source_connection',
    description:
      'Test a database connection without saving. Pass dataSourceId alone to test an existing saved connection, or pass type/host/port/database/username/password for a new one. Returns ok, latency, serverVersion, readonlyLikely, and warnings.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['postgresql', 'mysql', 'mariadb', 'sqlserver'] },
        host: { type: 'string' },
        port: { type: 'integer' },
        database: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string' },
        ssl: { type: 'boolean' },
        schema: { type: 'string' },
        dataSourceId: {
          type: 'string',
          description: 'Optional existing data source id to reuse stored host/username/password',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_data_source',
    description: 'Create and encrypt a new data source connection after a successful test.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['postgresql', 'mysql', 'mariadb', 'sqlserver'] },
        host: { type: 'string' },
        port: { type: 'integer' },
        database: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string' },
        ssl: { type: 'boolean' },
        schema: { type: 'string' },
      },
      required: ['name', 'type', 'host', 'port', 'database', 'username', 'password'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_data_source',
    description: 'Update an existing data source. Omit password to keep the stored secret.',
    parameters: {
      type: 'object',
      properties: {
        dataSourceId: { type: 'string' },
        name: { type: 'string' },
        host: { type: 'string' },
        port: { type: 'integer' },
        database: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string' },
        ssl: { type: 'boolean' },
        schema: { type: 'string' },
      },
      required: ['dataSourceId'],
      additionalProperties: false,
    },
  },
  {
    name: 'introspect_data_source',
    description:
      'Run schema introspection for a data source (tables, columns, relationships including inferred FKs). Prefer this before proposing semantics or dashboards.',
    parameters: {
      type: 'object',
      properties: {
        dataSourceId: { type: 'string' },
      },
      required: ['dataSourceId'],
      additionalProperties: false,
    },
  },
  {
    name: 'inspect_schema',
    description:
      'Inspect detailed columns and relationships from the latest schema snapshot. Optionally filter by table name search.',
    parameters: {
      type: 'object',
      properties: {
        dataSourceId: { type: 'string' },
        search: { type: 'string', description: 'Substring match on schema.table names' },
        limit: { type: 'integer', description: 'Max tables to return (default 20)' },
      },
      required: ['dataSourceId'],
      additionalProperties: false,
    },
  },
  {
    name: 'ask_user',
    description:
      'Pause and ask the user a clarifying question with 2–6 selectable answers. Use when the request is vague, a business term is unclear, or before bulk-approving semantics. Do not continue mutating tools until the user answers.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['id', 'label'],
          },
        },
        allowMultiple: {
          type: 'boolean',
          description: 'When true, user may select more than one option',
        },
      },
      required: ['question', 'options'],
      additionalProperties: false,
    },
  },
  {
    name: 'sample_table_rows',
    description:
      'Read up to 5 sample rows from one table (fixed SELECT-only, no free-form SQL). Use to learn real values before defining metrics.',
    parameters: {
      type: 'object',
      properties: {
        dataSourceId: { type: 'string' },
        schema: { type: 'string' },
        table: { type: 'string' },
        limit: { type: 'integer', description: 'Max rows (capped at 5)' },
      },
      required: ['dataSourceId', 'schema', 'table'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_to_know_datasource',
    description:
      'Required before first analytics on a data source: introspect if needed, summarize schema, sample key tables, return openQuestions. Call this before create_and_run_query or save_dashboard for that data source.',
    parameters: {
      type: 'object',
      properties: {
        dataSourceId: { type: 'string' },
        tableSearch: {
          type: 'string',
          description: 'Optional substring to focus table sampling',
        },
        maxTables: {
          type: 'integer',
          description: 'Max tables to sample (capped at 8, default 5)',
        },
      },
      required: ['dataSourceId'],
      additionalProperties: false,
    },
  },
  {
    name: 'manage_semantic_model',
    description:
      'Create a semantic model, propose entities/metrics/dimensions (AI or heuristic), and optionally bulk-approve Proposed items. bulk_approve / create_and_approve require userConfirmed=true after ask_user confirmation.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'propose', 'bulk_approve', 'create_and_approve'],
        },
        dataSourceId: { type: 'string' },
        semanticModelId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        useAi: { type: 'boolean' },
        userConfirmed: {
          type: 'boolean',
          description: 'Required true for bulk_approve / create_and_approve',
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_and_run_query',
    description:
      'Create a structured QueryPlan (metrics/dimensions/filters/sort/limit), compile SELECT SQL, execute it, and return preview rows. Field refs must be schema.table.column from the snapshot. Requires prior get_to_know_datasource (or sample_table_rows) on this data source in the conversation.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        dataSourceId: { type: 'string' },
        semanticModelId: { type: 'string' },
        dashboardId: { type: 'string' },
        metrics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              expression: { type: 'string' },
              aggregation: {
                type: 'string',
                enum: ['sum', 'avg', 'count', 'min', 'max', 'count_distinct'],
              },
              alias: { type: 'string' },
            },
            required: ['aggregation', 'alias'],
          },
        },
        dimensions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              alias: { type: 'string' },
              granularity: { type: 'string', enum: ['day', 'week', 'month', 'year'] },
            },
            required: ['field', 'alias'],
          },
        },
        filters: { type: 'array', items: { type: 'object' } },
        sort: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              direction: { type: 'string', enum: ['ASC', 'DESC'] },
            },
            required: ['field', 'direction'],
          },
        },
        limit: { type: 'integer' },
      },
      required: ['name', 'dataSourceId', 'metrics'],
      additionalProperties: false,
    },
  },
  {
    name: 'save_dashboard',
    description:
      'Create or update a dashboard with widgets bound to existing queryIds (from create_and_run_query). Widget types: kpi, line, bar, area, pie, donut, table. Positions use a 12-column grid.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'update', 'nl_edit'] },
        dashboardId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        prompt: { type: 'string', description: 'For nl_edit action' },
        dataSourceId: { type: 'string', description: 'For nl_edit / generate fallback' },
        semanticModelId: { type: 'string' },
        widgets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['kpi', 'line', 'bar', 'area', 'pie', 'donut', 'table'],
              },
              title: { type: 'string' },
              queryId: { type: 'string' },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'integer' },
                  y: { type: 'integer' },
                  width: { type: 'integer' },
                  height: { type: 'integer' },
                },
                required: ['x', 'y', 'width', 'height'],
              },
              config: { type: 'object' },
            },
            required: ['type', 'title', 'queryId', 'position'],
          },
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
  },
];

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function asBool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

async function requireAdmin(ctx: AgentToolContext) {
  await assertWorkspaceRole(ctx.prisma, ctx.userId, ctx.workspaceId, 'Admin');
}

async function requireMember(ctx: AgentToolContext) {
  await assertWorkspaceRole(ctx.prisma, ctx.userId, ctx.workspaceId, 'Member');
}

export async function runAgentTool(
  name: string,
  rawArgs: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  try {
    switch (name) {
      case 'get_workspace_overview':
        return await toolOverview(ctx);
      case 'test_data_source_connection':
        return await toolTestConnection(rawArgs, ctx);
      case 'create_data_source':
        return await toolCreateDataSource(rawArgs, ctx);
      case 'update_data_source':
        return await toolUpdateDataSource(rawArgs, ctx);
      case 'introspect_data_source':
        return await toolIntrospect(rawArgs, ctx);
      case 'inspect_schema':
        return await toolInspectSchema(rawArgs, ctx);
      case 'ask_user':
        return toolAskUser(rawArgs);
      case 'sample_table_rows':
        return await toolSampleRows(rawArgs, ctx);
      case 'get_to_know_datasource':
        return await toolGetToKnow(rawArgs, ctx);
      case 'manage_semantic_model':
        return await toolSemantic(rawArgs, ctx);
      case 'create_and_run_query':
        return await toolQuery(rawArgs, ctx);
      case 'save_dashboard':
        return await toolDashboard(rawArgs, ctx);
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Tool failed';
    return { ok: false, error: message };
  }
}

async function toolOverview(ctx: AgentToolContext): Promise<AgentToolResult> {
  await assertWorkspaceRole(ctx.prisma, ctx.userId, ctx.workspaceId, 'Viewer');
  const [dataSources, semanticModels, queries, dashboards] = await Promise.all([
    ctx.dataSources.list(ctx.workspaceId),
    ctx.semantic.list(ctx.workspaceId),
    ctx.queries.list(ctx.workspaceId),
    ctx.dashboards.list(ctx.workspaceId),
  ]);
  return {
    ok: true,
    data: {
      dataSources: dataSources.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        host: d.host,
        database: d.database,
        connectionStatus: d.connectionStatus,
        introspectionStatus: d.introspectionStatus,
      })),
      semanticModels: semanticModels.map((m) => ({
        id: m.id,
        name: m.name,
        dataSourceId: m.dataSourceId,
      })),
      queries: queries.map((q) => ({
        id: q.id,
        name: q.name,
        dataSourceId: q.dataSourceId,
      })),
      dashboards: dashboards.map((d) => ({
        id: d.id,
        name: d.name,
        currentVersion: d.currentVersion,
      })),
    },
  };
}

async function toolTestConnection(
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  await requireAdmin(ctx);
  const type = asString(args.type) as ConnectorType | undefined;
  const host = asString(args.host);
  const port = asNumber(args.port);
  const database = asString(args.database);
  const username = asString(args.username);
  const dataSourceId = asString(args.dataSourceId);
  let resolvedType = type;
  let resolvedHost = host;
  let resolvedPort = port;
  let resolvedDatabase = database;
  let resolvedUsername = username;

  if (dataSourceId) {
    const existing = await ctx.dataSources.get(ctx.workspaceId, dataSourceId);
    resolvedType = resolvedType ?? (existing.type as ConnectorType);
    resolvedHost = resolvedHost ?? existing.host;
    resolvedPort = resolvedPort ?? existing.port;
    resolvedDatabase = resolvedDatabase ?? existing.database;
    resolvedUsername = resolvedUsername ?? existing.username;
  }

  if (
    !resolvedType ||
    !resolvedHost ||
    !resolvedPort ||
    !resolvedDatabase ||
    !resolvedUsername
  ) {
    throw new ValidationError('type, host, port, database, and username are required');
  }
  const result = await ctx.dataSources.testConfigInput({
    workspaceId: ctx.workspaceId,
    type: resolvedType,
    dataSourceId,
    config: {
      host: resolvedHost,
      port: resolvedPort,
      database: resolvedDatabase,
      username: resolvedUsername,
      password: asString(args.password),
      ssl: asBool(args.ssl),
      schema: asString(args.schema),
    },
  });
  return {
    ok: result.ok,
    data: redactSecrets({
      ...result,
      safetyNote: result.readonlyLikely
        ? 'Connection user looks read-only.'
        : 'WARNING: DB user appears writable. Prefer a read-only account before giving AI access.',
    }),
  };
}

async function toolCreateDataSource(
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  await requireAdmin(ctx);
  const name = asString(args.name);
  const type = asString(args.type) as ConnectorType | undefined;
  const host = asString(args.host);
  const port = asNumber(args.port);
  const database = asString(args.database);
  const username = asString(args.username);
  const password = asString(args.password);
  if (!name || !type || !host || !port || !database || !username || !password) {
    throw new ValidationError('Missing required connection fields');
  }
  const ds = await ctx.dataSources.create({
    workspaceId: ctx.workspaceId,
    name,
    type,
    config: {
      host,
      port,
      database,
      username,
      password,
      ssl: asBool(args.ssl) ?? false,
      schema: asString(args.schema),
    },
    actorId: ctx.userId,
  });
  return {
    ok: true,
    data: ds,
    artifacts: [{ type: 'data_source', id: ds.id, label: ds.name }],
  };
}

async function toolUpdateDataSource(
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  await requireAdmin(ctx);
  const dataSourceId = asString(args.dataSourceId);
  if (!dataSourceId) throw new ValidationError('dataSourceId required');
  const existing = await ctx.dataSources.get(ctx.workspaceId, dataSourceId);
  const ds = await ctx.dataSources.update(
    ctx.workspaceId,
    dataSourceId,
    {
      name: asString(args.name),
      config:
        asString(args.host) && asNumber(args.port) && asString(args.database) && asString(args.username)
          ? {
              host: asString(args.host)!,
              port: asNumber(args.port)!,
              database: asString(args.database)!,
              username: asString(args.username)!,
              password: asString(args.password),
              ssl: asBool(args.ssl) ?? existing.ssl,
              schema: asString(args.schema) ?? existing.schema,
            }
          : undefined,
    },
    ctx.userId,
  );
  return {
    ok: true,
    data: ds,
    artifacts: [{ type: 'data_source', id: ds.id, label: ds.name }],
  };
}

async function toolIntrospect(
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  await requireAdmin(ctx);
  const dataSourceId = asString(args.dataSourceId);
  if (!dataSourceId) throw new ValidationError('dataSourceId required');

  const queued = await ctx.dataSources.introspect(ctx.workspaceId, dataSourceId);
  let status = await ctx.dataSources.getJobStatus(ctx.workspaceId, queued.jobId);
  const deadline = Date.now() + 8_000;
  while (
    (status.status === 'queued' || status.status === 'active') &&
    Date.now() < deadline
  ) {
    await new Promise((r) => setTimeout(r, 500));
    status = await ctx.dataSources.getJobStatus(ctx.workspaceId, queued.jobId);
  }

  if (status.status !== 'completed') {
    // Fallback: run introspection inline when the worker is slow/unavailable.
    try {
      const inline = await ctx.dataSources.introspectInline(ctx.workspaceId, dataSourceId);
      const schema = await ctx.dataSources.getSchema(ctx.workspaceId, dataSourceId);
      return {
        ok: true,
        data: {
          mode: 'inline',
          summary: inline,
          tableCount: (schema.snapshot?.tables as unknown[] | undefined)?.length ?? 0,
          relationshipCount:
            (schema.snapshot?.relationships as unknown[] | undefined)?.length ?? 0,
        },
        artifacts: [{ type: 'data_source', id: dataSourceId, label: 'introspected' }],
      };
    } catch (error) {
      return {
        ok: false,
        error:
          status.error ??
          (error instanceof Error ? error.message : 'Introspection failed'),
      };
    }
  }

  const schema = await ctx.dataSources.getSchema(ctx.workspaceId, dataSourceId);
  const tables = (schema.snapshot?.tables as Array<{ schema: string; name: string }> | undefined) ?? [];
  const relationships =
    (schema.snapshot?.relationships as unknown[] | undefined) ?? [];
  return {
    ok: true,
    data: {
      mode: 'queue',
      jobId: queued.jobId,
      tables: tables.slice(0, 40).map((t) => `${t.schema}.${t.name}`),
      tableCount: tables.length,
      relationshipCount: relationships.length,
    },
    artifacts: [{ type: 'data_source', id: dataSourceId, label: 'introspected' }],
  };
}

async function toolInspectSchema(
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  await assertWorkspaceRole(ctx.prisma, ctx.userId, ctx.workspaceId, 'Viewer');
  const dataSourceId = asString(args.dataSourceId);
  if (!dataSourceId) throw new ValidationError('dataSourceId required');
  const schema = await ctx.dataSources.getSchema(ctx.workspaceId, dataSourceId);
  if (!schema.snapshot) {
    throw new AppError('No schema snapshot. Run introspect_data_source first.', 'SCHEMA_REQUIRED', 400);
  }
  const search = asString(args.search)?.toLowerCase();
  const limit = asNumber(args.limit) ?? 20;
  const tables = (
    (schema.snapshot.tables as Array<{
      schema: string;
      name: string;
      type: string;
      columns: Array<{
        name: string;
        dataType: string;
        nativeDataType?: string;
        isPrimaryKey?: boolean;
        isForeignKey?: boolean;
      }>;
    }>) ?? []
  )
    .filter((t) =>
      search ? `${t.schema}.${t.name}`.toLowerCase().includes(search) : true,
    )
    .slice(0, limit);

  const relationships = (
    (schema.snapshot.relationships as Array<{
      sourceSchema: string;
      sourceTable: string;
      sourceColumn: string;
      targetSchema: string;
      targetTable: string;
      targetColumn: string;
      source?: string;
    }>) ?? []
  ).filter((r) =>
    search
      ? `${r.sourceTable}.${r.targetTable}`.toLowerCase().includes(search) ||
        tables.some(
          (t) =>
            t.name === r.sourceTable ||
            t.name === r.targetTable,
        )
      : true,
  );

  return {
    ok: true,
    data: {
      version: schema.snapshot.version,
      tables: tables.map((t) => ({
        ref: `${t.schema}.${t.name}`,
        type: t.type,
        columns: t.columns.map((c) => ({
          name: c.name,
          dataType: c.dataType,
          pk: Boolean(c.isPrimaryKey),
          fk: Boolean(c.isForeignKey),
        })),
      })),
      relationships: relationships.slice(0, 80),
    },
  };
}

function requireGrounded(ctx: AgentToolContext, dataSourceId: string): AgentToolResult | null {
  if (ctx.groundedDataSourceIds.has(dataSourceId)) return null;
  return {
    ok: false,
    error:
      'DATASOURCE_NOT_GROUNDED: call get_to_know_datasource (or sample_table_rows) for this data source before analytics.',
    data: { code: 'DATASOURCE_NOT_GROUNDED', dataSourceId },
  };
}

function toolAskUser(args: Record<string, unknown>): AgentToolResult {
  const question = asString(args.question);
  if (!question) throw new ValidationError('question required');
  const rawOptions = Array.isArray(args.options) ? args.options : [];
  const options = rawOptions
    .map((o) => {
      const row = o as Record<string, unknown>;
      const id = asString(row.id);
      const label = asString(row.label);
      if (!id || !label) return null;
      return { id, label };
    })
    .filter((o): o is { id: string; label: string } => Boolean(o))
    .slice(0, 6);
  if (options.length < 2) {
    throw new ValidationError('ask_user requires at least 2 options (max 6)');
  }
  const askId = randomUUID();
  const allowMultiple = asBool(args.allowMultiple) === true;
  return {
    ok: true,
    data: { askId, question, options, allowMultiple, status: 'awaiting_input' },
    pauseAsk: { askId, question, options, allowMultiple },
  };
}

async function toolSampleRows(
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  await assertWorkspaceRole(ctx.prisma, ctx.userId, ctx.workspaceId, 'Viewer');
  const dataSourceId = asString(args.dataSourceId);
  const schema = asString(args.schema);
  const table = asString(args.table);
  if (!dataSourceId || !schema || !table) {
    throw new ValidationError('dataSourceId, schema, and table are required');
  }
  const sample = await ctx.dataSources.sampleTableRows(
    ctx.workspaceId,
    dataSourceId,
    schema,
    table,
    asNumber(args.limit) ?? 5,
  );
  ctx.groundedDataSourceIds.add(dataSourceId);
  return { ok: true, data: { dataSourceId, ...sample } };
}

async function toolGetToKnow(
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  await requireMember(ctx);
  const dataSourceId = asString(args.dataSourceId);
  if (!dataSourceId) throw new ValidationError('dataSourceId required');

  let schema = await ctx.dataSources.getSchema(ctx.workspaceId, dataSourceId);
  if (!schema.snapshot) {
    await toolIntrospect({ dataSourceId }, ctx);
    schema = await ctx.dataSources.getSchema(ctx.workspaceId, dataSourceId);
  }
  if (!schema.snapshot) {
    return { ok: false, error: 'No schema snapshot available after introspection' };
  }

  const search = asString(args.tableSearch)?.toLowerCase();
  const maxTables = Math.min(Math.max(1, asNumber(args.maxTables) ?? 5), 8);
  const allTables = (
    (schema.snapshot.tables as Array<{
      schema: string;
      name: string;
      type: string;
      columns: Array<{
        name: string;
        dataType: string;
        isPrimaryKey?: boolean;
        isForeignKey?: boolean;
      }>;
    }>) ?? []
  ).filter((t) =>
    search ? `${t.schema}.${t.name}`.toLowerCase().includes(search) : true,
  );

  const relationships = (
    (schema.snapshot.relationships as Array<{
      sourceSchema: string;
      sourceTable: string;
      sourceColumn: string;
      targetSchema: string;
      targetTable: string;
      targetColumn: string;
      source?: string;
    }>) ?? []
  ).slice(0, 80);

  const sampleTargets = allTables.slice(0, maxTables);
  const samples: Array<{
    ref: string;
    columns: string[];
    rows: Record<string, unknown>[];
    error?: string;
  }> = [];

  for (const t of sampleTargets) {
    try {
      const sample = await ctx.dataSources.sampleTableRows(
        ctx.workspaceId,
        dataSourceId,
        t.schema,
        t.name,
        5,
      );
      samples.push({
        ref: sample.ref,
        columns: sample.columns,
        rows: sample.rows as Record<string, unknown>[],
      });
    } catch (error) {
      samples.push({
        ref: `${t.schema}.${t.name}`,
        columns: [],
        rows: [],
        error: error instanceof Error ? error.message : 'Sample failed',
      });
    }
  }

  const openQuestions: Array<{ id: string; label: string }> = [];
  for (const t of allTables.slice(0, 12)) {
    for (const c of t.columns) {
      const n = c.name.toLowerCase();
      if (
        /status|type|kind|state|role|category/.test(n) &&
        openQuestions.length < 4
      ) {
        openQuestions.push({
          id: `meaning_${t.name}_${c.name}`,
          label: `What does ${t.schema}.${t.name}.${c.name} mean for your business?`,
        });
      }
    }
  }
  if (relationships.length === 0 && allTables.length > 1) {
    openQuestions.push({
      id: 'joins',
      label: 'Which tables should be joined for this analysis? (tell me the keys)',
    });
  }

  ctx.groundedDataSourceIds.add(dataSourceId);

  return {
    ok: true,
    data: {
      dataSourceId,
      tableCount: allTables.length,
      tables: allTables.slice(0, 40).map((t) => ({
        ref: `${t.schema}.${t.name}`,
        type: t.type,
        columns: t.columns.map((c) => ({
          name: c.name,
          dataType: c.dataType,
          pk: Boolean(c.isPrimaryKey),
          fk: Boolean(c.isForeignKey),
        })),
      })),
      relationships,
      samples,
      openQuestions,
      note: 'Only cite facts from this payload. Ask the user about openQuestions that block the request.',
    },
    artifacts: [{ type: 'data_source', id: dataSourceId, label: 'grounded' }],
  };
}

async function toolSemantic(
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  await requireMember(ctx);
  const action = asString(args.action);
  if (!action) throw new ValidationError('action required');

  if (action === 'bulk_approve' || action === 'create_and_approve') {
    if (asBool(args.userConfirmed) !== true) {
      return {
        ok: false,
        error:
          'CONFIRMATION_REQUIRED: call ask_user to confirm approving semantic items, then retry with userConfirmed=true.',
        data: { code: 'CONFIRMATION_REQUIRED', action },
      };
    }
  }

  if (action === 'create' || action === 'create_and_approve') {
    const dataSourceId = asString(args.dataSourceId);
    const name = asString(args.name) ?? 'Agent semantic model';
    if (!dataSourceId) throw new ValidationError('dataSourceId required');
    const model = await ctx.semantic.create({
      workspaceId: ctx.workspaceId,
      dataSourceId,
      name,
      description: asString(args.description),
    });
    const proposed = await ctx.semantic.propose(ctx.workspaceId, model.id, {
      useAi: asBool(args.useAi) !== false,
    });
    if (action === 'create_and_approve') {
      for (const kind of ['entities', 'metrics', 'dimensions', 'relationships'] as const) {
        await ctx.semantic.bulkSetStatus(
          ctx.workspaceId,
          model.id,
          kind,
          'Proposed',
          'Approved',
        );
      }
    }
    const fresh = await ctx.semantic.get(ctx.workspaceId, model.id);
    return {
      ok: true,
      data: { model: fresh, proposedMeta: proposed },
      artifacts: [{ type: 'semantic_model', id: model.id, label: model.name }],
    };
  }

  if (action === 'propose') {
    const semanticModelId = asString(args.semanticModelId);
    if (!semanticModelId) throw new ValidationError('semanticModelId required');
    const proposed = await ctx.semantic.propose(ctx.workspaceId, semanticModelId, {
      useAi: asBool(args.useAi) !== false,
    });
    return {
      ok: true,
      data: proposed,
      artifacts: [{ type: 'semantic_model', id: semanticModelId }],
    };
  }

  if (action === 'bulk_approve') {
    const semanticModelId = asString(args.semanticModelId);
    if (!semanticModelId) throw new ValidationError('semanticModelId required');
    for (const kind of ['entities', 'metrics', 'dimensions', 'relationships'] as const) {
      await ctx.semantic.bulkSetStatus(
        ctx.workspaceId,
        semanticModelId,
        kind,
        'Proposed',
        'Approved',
      );
    }
    const fresh = await ctx.semantic.get(ctx.workspaceId, semanticModelId);
    return {
      ok: true,
      data: fresh,
      artifacts: [{ type: 'semantic_model', id: semanticModelId }],
    };
  }

  throw new ValidationError(`Unsupported semantic action: ${action}`);
}

async function toolQuery(
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  await requireMember(ctx);
  const name = asString(args.name);
  const dataSourceId = asString(args.dataSourceId);
  if (!name || !dataSourceId) throw new ValidationError('name and dataSourceId required');
  const gate = requireGrounded(ctx, dataSourceId);
  if (gate) return gate;

  const plan = queryPlanSchema.parse({
    dataSourceId,
    metrics: args.metrics,
    dimensions: args.dimensions ?? [],
    filters: args.filters ?? [],
    sort: args.sort ?? [],
    limit: asNumber(args.limit) ?? 100,
  });

  const created = await ctx.queries.create({
    workspaceId: ctx.workspaceId,
    name,
    semanticModelId: asString(args.semanticModelId),
    dashboardId: asString(args.dashboardId),
    plan,
  });
  const executed = await ctx.queries.execute(ctx.workspaceId, created.id);
  return {
    ok: true,
    data: {
      query: created,
      result: {
        columns: executed.result?.columns,
        rowCount: executed.result?.rowCount,
        truncated: executed.result?.truncated,
        previewRows: (executed.result?.rows ?? []).slice(0, 15),
        compiledSql: created.compiledSql,
      },
    },
    artifacts: [{ type: 'query', id: created.id, label: created.name }],
  };
}

async function toolDashboard(
  args: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  await requireMember(ctx);
  const action = asString(args.action);
  if (!action) throw new ValidationError('action required');

  const relatedDs = asString(args.dataSourceId);
  if (relatedDs && (action === 'create' || action === 'nl_edit')) {
    const gate = requireGrounded(ctx, relatedDs);
    if (gate) return gate;
  }

  if (action === 'nl_edit') {
    const dashboardId = asString(args.dashboardId);
    const prompt = asString(args.prompt);
    if (!dashboardId || !prompt) {
      throw new ValidationError('dashboardId and prompt required for nl_edit');
    }
    const edited = await ctx.dashboards.edit({
      workspaceId: ctx.workspaceId,
      dashboardId,
      prompt,
      useAi: true,
    });
    return {
      ok: true,
      data: edited,
      artifacts: [
        {
          type: 'dashboard',
          id: edited.dashboard.id,
          label: edited.dashboard.name,
        },
      ],
    };
  }

  if (action === 'create') {
    const name = asString(args.name) ?? 'Agent dashboard';
    const widgets = Array.isArray(args.widgets) ? args.widgets : [];
    const spec = dashboardSpecSchema.parse({
      version: 1,
      title: name,
      description: asString(args.description),
      layout: { columns: 12, rowHeight: 80 },
      widgets: widgets.map((w, i) => {
        const widget = w as Record<string, unknown>;
        const position = (widget.position ?? {}) as Record<string, unknown>;
        return {
          id: randomUUID(),
          type: widget.type,
          title: widget.title,
          queryId: widget.queryId,
          position: {
            x: asNumber(position.x) ?? (i % 2) * 6,
            y: asNumber(position.y) ?? Math.floor(i / 2) * 4,
            width: asNumber(position.width) ?? 6,
            height: asNumber(position.height) ?? 4,
          },
          config: (widget.config as Record<string, unknown>) ?? {},
        };
      }),
    });
    const created = await ctx.dashboards.create({
      workspaceId: ctx.workspaceId,
      name,
      description: asString(args.description),
      spec,
    });
    return {
      ok: true,
      data: { dashboard: created, spec },
      artifacts: [{ type: 'dashboard', id: created.id, label: created.name }],
    };
  }

  if (action === 'update') {
    const dashboardId = asString(args.dashboardId);
    if (!dashboardId) throw new ValidationError('dashboardId required');
    const widgets = Array.isArray(args.widgets) ? args.widgets : undefined;
    const updated = await ctx.dashboards.update(ctx.workspaceId, dashboardId, {
      name: asString(args.name),
      description: asString(args.description),
      spec: widgets
        ? dashboardSpecSchema.parse({
            version: 1,
            title: asString(args.name) ?? 'Dashboard',
            description: asString(args.description),
            layout: { columns: 12, rowHeight: 80 },
            widgets: widgets.map((w, i) => {
              const widget = w as Record<string, unknown>;
              const position = (widget.position ?? {}) as Record<string, unknown>;
              return {
                id: asString(widget.id) ?? randomUUID(),
                type: widget.type,
                title: widget.title,
                queryId: widget.queryId,
                position: {
                  x: asNumber(position.x) ?? (i % 2) * 6,
                  y: asNumber(position.y) ?? Math.floor(i / 2) * 4,
                  width: asNumber(position.width) ?? 6,
                  height: asNumber(position.height) ?? 4,
                },
                config: (widget.config as Record<string, unknown>) ?? {},
              };
            }),
          })
        : undefined,
    });
    return {
      ok: true,
      data: updated,
      artifacts: [{ type: 'dashboard', id: dashboardId, label: asString(args.name) }],
    };
  }

  throw new ValidationError(`Unsupported dashboard action: ${action}`);
}
