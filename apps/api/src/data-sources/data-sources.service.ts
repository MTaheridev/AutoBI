import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  connectorRegistry,
  registerBuiltinConnectors,
  type ConnectionConfig,
  type ConnectorType,
} from '@autobi/connectors';
import { allowPrivateDbHosts } from '@autobi/config';
import { assertSafeIdent, quoteTable, type ConnectorDialect } from '@autobi/query-engine';
import {
  assertSafeDbHost,
  createId,
  NotFoundError,
  sanitizeClientError,
  summarizeInternalError,
  ValidationError,
} from '@autobi/shared';
import type { DataSourceType } from '@autobi/database';
import { PrismaService } from '../core/prisma.service.js';
import { EncryptionService } from '../core/encryption.service.js';
import { QueueService } from '../core/queue.service.js';
import { AuditService } from '../core/audit.service.js';

/** BullMQ job payload for schema introspection. */
export type IntrospectionJobData = {
  dataSourceId: string;
  workspaceId: string;
};

/** True only when the job payload is scoped to the given workspace. */
export function jobBelongsToWorkspace(
  job: { data?: Partial<IntrospectionJobData> } | null | undefined,
  workspaceId: string,
): boolean {
  return Boolean(job?.data?.workspaceId && job.data.workspaceId === workspaceId);
}

@Injectable()
export class DataSourcesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly queues: QueueService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    registerBuiltinConnectors();
  }

  private toDto(ds: {
    id: string;
    workspaceId: string;
    name: string;
    type: DataSourceType;
    host: string;
    port: number;
    databaseName: string;
    username: string;
    ssl: boolean;
    schemaName: string | null;
    connectionStatus: string;
    introspectionStatus: string;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: ds.id,
      workspaceId: ds.workspaceId,
      name: ds.name,
      type: ds.type,
      host: ds.host,
      port: ds.port,
      database: ds.databaseName,
      username: ds.username,
      ssl: ds.ssl,
      schema: ds.schemaName ?? undefined,
      connectionStatus: ds.connectionStatus as 'unknown' | 'connected' | 'failed',
      introspectionStatus: ds.introspectionStatus as
        | 'idle'
        | 'running'
        | 'succeeded'
        | 'failed',
      lastError: ds.lastError,
      createdAt: ds.createdAt.toISOString(),
      updatedAt: ds.updatedAt.toISOString(),
    };
  }

  private decryptConfig(encryptedConfig: string): ConnectionConfig {
    return JSON.parse(this.encryption.decrypt(encryptedConfig)) as ConnectionConfig;
  }

  private async assertHost(config: ConnectionConfig) {
    await assertSafeDbHost(config.host, { allowPrivate: allowPrivateDbHosts() });
  }

  async create(input: {
    workspaceId: string;
    name: string;
    type: ConnectorType;
    config: ConnectionConfig;
    actorId?: string;
  }) {
    await this.assertHost(input.config);
    const encryptedConfig = this.encryption.encrypt(JSON.stringify(input.config));
    const ds = await this.prisma.dataSource.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        type: input.type,
        encryptedConfig,
        host: input.config.host,
        port: input.config.port,
        databaseName: input.config.database,
        username: input.config.username,
        ssl: input.config.ssl ?? false,
        schemaName: input.config.schema,
      },
    });
    await this.audit.record({
      action: 'datasource.create',
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      metadata: { dataSourceId: ds.id, type: ds.type, name: ds.name },
    });
    return this.toDto(ds);
  }

  async list(workspaceId: string) {
    const items = await this.prisma.dataSource.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    return items.map((ds) => this.toDto(ds));
  }

  async get(workspaceId: string, id: string) {
    const ds = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!ds) throw new NotFoundError('Data source not found');
    return this.toDto(ds);
  }

  async update(
    workspaceId: string,
    id: string,
    input: {
      name?: string;
      config?: Omit<ConnectionConfig, 'password'> & { password?: string };
    },
    actorId?: string,
  ) {
    const existing = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!existing) throw new NotFoundError('Data source not found');

    const data: Record<string, unknown> = {};
    if (input.name) data.name = input.name;
    if (input.config) {
      const previous = this.decryptConfig(existing.encryptedConfig);
      const password = input.config.password?.trim()
        ? input.config.password
        : previous.password;
      const config: ConnectionConfig = {
        host: input.config.host,
        port: input.config.port,
        database: input.config.database,
        username: input.config.username,
        password,
        ssl: input.config.ssl,
        sslAllowInsecure: input.config.sslAllowInsecure,
        schema: input.config.schema,
        connectionTimeoutMs: input.config.connectionTimeoutMs,
      };
      await this.assertHost(config);
      data.encryptedConfig = this.encryption.encrypt(JSON.stringify(config));
      data.host = config.host;
      data.port = config.port;
      data.databaseName = config.database;
      data.username = config.username;
      data.ssl = config.ssl ?? false;
      data.schemaName = config.schema;
      data.connectionStatus = 'unknown';
    }

    const ds = await this.prisma.dataSource.update({ where: { id }, data });
    await this.audit.record({
      action: 'datasource.update',
      actorId,
      workspaceId,
      metadata: { dataSourceId: id, name: ds.name, configChanged: Boolean(input.config) },
    });
    return this.toDto(ds);
  }

  /** Ephemeral connection test (does not persist). */
  async testConfig(type: ConnectorType, config: ConnectionConfig) {
    await this.assertHost(config);
    const connector = connectorRegistry.create(type);
    const result = await connector.testConnection(config);
    return {
      ...result,
      message: result.ok
        ? result.message
        : sanitizeClientError(result.message, 'Connection failed'),
    };
  }

  async testConfigInput(input: {
    workspaceId: string;
    type: ConnectorType;
    dataSourceId?: string;
    config: Omit<ConnectionConfig, 'password'> & { password?: string };
  }) {
    let password = input.config.password?.trim() ? input.config.password : '';
    if (!password) {
      if (!input.dataSourceId) {
        throw new ValidationError('Password is required to test a new connection');
      }
      const existing = await this.prisma.dataSource.findFirst({
        where: { id: input.dataSourceId, workspaceId: input.workspaceId },
      });
      if (!existing) throw new NotFoundError('Data source not found');
      password = this.decryptConfig(existing.encryptedConfig).password;
    }
    return this.testConfig(input.type, {
      host: input.config.host,
      port: input.config.port,
      database: input.config.database,
      username: input.config.username,
      password,
      ssl: input.config.ssl,
      sslAllowInsecure: input.config.sslAllowInsecure,
      schema: input.config.schema,
      connectionTimeoutMs: input.config.connectionTimeoutMs,
    });
  }

  async delete(workspaceId: string, id: string, actorId?: string) {
    const existing = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!existing) throw new NotFoundError('Data source not found');
    await this.prisma.dataSource.delete({ where: { id } });
    await this.audit.record({
      action: 'datasource.delete',
      actorId,
      workspaceId,
      metadata: { dataSourceId: id, name: existing.name },
    });
    return { ok: true };
  }

  async test(workspaceId: string, id: string) {
    const ds = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!ds) throw new NotFoundError('Data source not found');

    const config = this.decryptConfig(ds.encryptedConfig);
    const clientResult = await this.testConfig(ds.type, config);

    await this.prisma.dataSource.update({
      where: { id },
      data: {
        connectionStatus: clientResult.ok ? 'connected' : 'failed',
        lastError: clientResult.ok
          ? null
          : summarizeInternalError(new Error(clientResult.message)),
      },
    });

    return clientResult;
  }

  async introspect(workspaceId: string, id: string) {
    const ds = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!ds) throw new NotFoundError('Data source not found');

    await this.assertHost(this.decryptConfig(ds.encryptedConfig));

    await this.prisma.dataSource.update({
      where: { id },
      data: { introspectionStatus: 'running', lastError: null },
    });

    const jobId = createId();
    const payload: IntrospectionJobData = {
      dataSourceId: id,
      workspaceId,
    };
    const job = await this.queues.introspection.add('introspect', payload, {
      jobId,
    });

    return { jobId: job.id ?? jobId, status: 'queued' as const };
  }

  /** Synchronous introspection used by Agent Mode when the queue worker is unavailable. */
  async introspectInline(workspaceId: string, id: string) {
    const ds = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!ds) throw new NotFoundError('Data source not found');

    const config = this.decryptConfig(ds.encryptedConfig);
    await this.assertHost(config);

    await this.prisma.dataSource.update({
      where: { id },
      data: { introspectionStatus: 'running', lastError: null },
    });

    const connector = connectorRegistry.create(ds.type);
    try {
      await connector.connect(config);
      const result = await connector.introspect();
      const latest = await this.prisma.schemaSnapshot.findFirst({
        where: { dataSourceId: ds.id },
        orderBy: { version: 'desc' },
      });
      const version = (latest?.version ?? 0) + 1;
      const metadata = {
        schemas: result.schemas.map((s) => s.name),
        tables: JSON.parse(JSON.stringify(result.tables)),
        relationships: JSON.parse(JSON.stringify(result.relationships)),
      };
      await this.prisma.schemaSnapshot.create({
        data: {
          dataSourceId: ds.id,
          version,
          metadata,
        },
      });
      await this.prisma.dataSource.update({
        where: { id },
        data: {
          introspectionStatus: 'succeeded',
          connectionStatus: 'connected',
          lastError: null,
        },
      });
      return {
        version,
        schemaCount: result.schemas.length,
        tableCount: result.tables.length,
        relationshipCount: result.relationships.length,
      };
    } catch (error) {
      await this.prisma.dataSource.update({
        where: { id },
        data: {
          introspectionStatus: 'failed',
          lastError: summarizeInternalError(error),
        },
      });
      throw error;
    } finally {
      await connector.close();
    }
  }

  async getJobStatus(workspaceId: string, jobId: string) {
    const job = await this.queues.introspection.getJob(jobId);
    if (!job || !jobBelongsToWorkspace(job, workspaceId)) {
      throw new NotFoundError('Job not found');
    }
    const state = await job.getState();
    const status =
      state === 'completed'
        ? 'completed'
        : state === 'failed'
          ? 'failed'
          : state === 'active'
            ? 'active'
            : 'queued';
    return {
      jobId,
      status,
      error: job.failedReason
        ? sanitizeClientError(job.failedReason, 'Introspection failed')
        : undefined,
      result: job.returnvalue,
    };
  }

  async getSchema(workspaceId: string, id: string) {
    const ds = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!ds) throw new NotFoundError('Data source not found');

    const snapshot = await this.prisma.schemaSnapshot.findFirst({
      where: { dataSourceId: id },
      orderBy: { version: 'desc' },
    });
    if (!snapshot) return { snapshot: null };

    const metadata = snapshot.metadata as {
      schemas: string[];
      tables: unknown[];
      relationships: unknown[];
    };

    return {
      snapshot: {
        id: snapshot.id,
        dataSourceId: snapshot.dataSourceId,
        version: snapshot.version,
        schemas: metadata.schemas,
        tables: metadata.tables,
        relationships: metadata.relationships,
        createdAt: snapshot.createdAt.toISOString(),
      },
    };
  }

  async getTables(workspaceId: string, id: string) {
    const { snapshot } = await this.getSchema(workspaceId, id);
    if (!snapshot) return { tables: [] };
    return { tables: snapshot.tables };
  }

  /**
   * Fixed SELECT-only sample for Agent Mode grounding. No free-form SQL.
   * Caps at 5 rows. Identifiers must pass assertSafeIdent.
   */
  async sampleTableRows(
    workspaceId: string,
    dataSourceId: string,
    schema: string,
    table: string,
    limit = 5,
  ) {
    assertSafeIdent(schema, 'schema');
    assertSafeIdent(table, 'table');
    const capped = Math.min(Math.max(1, Math.floor(limit)), 5);

    const ds = await this.prisma.dataSource.findFirst({
      where: { id: dataSourceId, workspaceId },
    });
    if (!ds) throw new NotFoundError('Data source not found');

    const config = this.decryptConfig(ds.encryptedConfig);
    await this.assertHost(config);

    const dialect = ds.type as ConnectorDialect;
    const tableSql = quoteTable(dialect, { schema, table });
    const sql =
      dialect === 'sqlserver'
        ? `SELECT TOP ${capped} * FROM ${tableSql}`
        : `SELECT * FROM ${tableSql} LIMIT ${capped}`;

    const connector = connectorRegistry.create(ds.type);
    try {
      await connector.connect(config);
      const result = await connector.executeQuery(
        { sql, params: [] },
        { maxRows: capped, timeoutMs: 15_000 },
      );
      return {
        schema,
        table,
        ref: `${schema}.${table}`,
        columns: result.columns,
        rows: result.rows.slice(0, capped),
        rowCount: Math.min(result.rowCount, capped),
      };
    } finally {
      await connector.close();
    }
  }
}
