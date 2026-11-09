import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  connectorRegistry,
  registerBuiltinConnectors,
  type ConnectionConfig,
  type ConnectorType,
} from '@autobi/connectors';
import { NotFoundError } from '@autobi/shared';
import type { DataSourceType } from '@autobi/database';
import { PrismaService } from '../core/prisma.service.js';
import { EncryptionService } from '../core/encryption.service.js';
import { QueueService } from '../core/queue.service.js';

@Injectable()
export class DataSourcesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly queues: QueueService,
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

  async create(input: {
    workspaceId: string;
    name: string;
    type: ConnectorType;
    config: ConnectionConfig;
  }) {
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
    input: { name?: string; config?: ConnectionConfig },
  ) {
    const existing = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!existing) throw new NotFoundError('Data source not found');

    const data: Record<string, unknown> = {};
    if (input.name) data.name = input.name;
    if (input.config) {
      data.encryptedConfig = this.encryption.encrypt(JSON.stringify(input.config));
      data.host = input.config.host;
      data.port = input.config.port;
      data.databaseName = input.config.database;
      data.username = input.config.username;
      data.ssl = input.config.ssl ?? false;
      data.schemaName = input.config.schema;
      data.connectionStatus = 'unknown';
    }

    const ds = await this.prisma.dataSource.update({ where: { id }, data });
    return this.toDto(ds);
  }

  async delete(workspaceId: string, id: string) {
    const existing = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!existing) throw new NotFoundError('Data source not found');
    await this.prisma.dataSource.delete({ where: { id } });
    return { ok: true };
  }

  async test(workspaceId: string, id: string) {
    const ds = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!ds) throw new NotFoundError('Data source not found');

    const config = this.decryptConfig(ds.encryptedConfig);
    const connector = connectorRegistry.create(ds.type);
    const result = await connector.testConnection(config);

    await this.prisma.dataSource.update({
      where: { id },
      data: {
        connectionStatus: result.ok ? 'connected' : 'failed',
        lastError: result.ok ? null : result.message,
      },
    });

    return result;
  }

  async introspect(workspaceId: string, id: string) {
    const ds = await this.prisma.dataSource.findFirst({ where: { id, workspaceId } });
    if (!ds) throw new NotFoundError('Data source not found');

    await this.prisma.dataSource.update({
      where: { id },
      data: { introspectionStatus: 'running', lastError: null },
    });

    const job = await this.queues.introspection.add('introspect', {
      dataSourceId: id,
      workspaceId,
    });

    return { jobId: job.id, status: 'queued' as const };
  }

  async getJobStatus(jobId: string) {
    const job = await this.queues.introspection.getJob(jobId);
    if (!job) throw new NotFoundError('Job not found');
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
      error: job.failedReason,
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
}
