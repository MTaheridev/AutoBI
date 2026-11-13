import pg from 'pg';
import { ConnectorError, sanitizeClientError } from '@autobi/shared';
import { inferRelationshipsFromColumns } from './infer-relationships.js';
import { normalizeDataType } from './normalize.js';
import { readonlyResult, writableResult } from './privilege-probe.js';
import { pgSslOption } from './ssl.js';
import { withQueryTimeout } from './timeout.js';
import type {
  CompiledQuery,
  ConnectionConfig,
  ConnectionTestResult,
  ConnectorFactory,
  DatabaseColumn,
  DatabaseConnector,
  DatabaseRelationship,
  DatabaseSchema,
  DatabaseTable,
  IntrospectionResult,
  QueryExecutionOptions,
  QueryResult,
} from './types.js';

const { Client } = pg;

export class PostgreSQLConnector implements DatabaseConnector {
  readonly type = 'postgresql' as const;
  private client: pg.Client | null = null;
  private config: ConnectionConfig | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    await this.close();
    this.config = config;
    this.client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: pgSslOption(config),
      connectionTimeoutMillis: config.connectionTimeoutMs ?? 10_000,
      statement_timeout: 30_000,
    });
    await this.client.connect();
  }

  private requireClient(): pg.Client {
    if (!this.client) throw new ConnectorError('PostgreSQL connector is not connected');
    return this.client;
  }

  async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    const started = Date.now();
    const client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: pgSslOption(config),
      connectionTimeoutMillis: config.connectionTimeoutMs ?? 10_000,
    });
    try {
      await client.connect();
      const result = await client.query('SELECT version() AS version');
      const privilege = await probePostgresReadonly(client);
      return {
        ok: true,
        message: 'Connection successful',
        latencyMs: Date.now() - started,
        serverVersion: String(result.rows[0]?.version ?? ''),
        ...privilege,
      };
    } catch (error) {
      return {
        ok: false,
        message: sanitizeClientError(error, 'Connection failed'),
        latencyMs: Date.now() - started,
      };
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  async getSchemas(): Promise<DatabaseSchema[]> {
    const client = this.requireClient();
    const result = await client.query<{ schema_name: string }>(
      `SELECT schema_name
       FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       ORDER BY schema_name`,
    );
    return result.rows.map((r) => ({ name: r.schema_name }));
  }

  async getTables(schema: string): Promise<DatabaseTable[]> {
    const client = this.requireClient();
    const tablesResult = await client.query<{ table_name: string; table_type: string }>(
      `SELECT table_name, table_type
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_type IN ('BASE TABLE', 'VIEW')
       ORDER BY table_name`,
      [schema],
    );

    const tables: DatabaseTable[] = [];
    for (const row of tablesResult.rows) {
      const columns = await this.getColumns(schema, row.table_name);
      tables.push({
        schema,
        name: row.table_name,
        type: row.table_type === 'VIEW' ? 'view' : 'table',
        columns,
      });
    }
    return tables;
  }

  async getColumns(schema: string, table: string): Promise<DatabaseColumn[]> {
    const client = this.requireClient();
    const columnsResult = await client.query<{
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
      column_default: string | null;
    }>(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, table],
    );

    const pkResult = await client.query<{ column_name: string }>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = $1
         AND tc.table_name = $2`,
      [schema, table],
    );
    const pk = new Set(pkResult.rows.map((r) => r.column_name));

    const fkResult = await client.query<{ column_name: string }>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = $1
         AND tc.table_name = $2`,
      [schema, table],
    );
    const fk = new Set(fkResult.rows.map((r) => r.column_name));

    return columnsResult.rows.map((col) => {
      const native = col.udt_name || col.data_type;
      return {
        name: col.column_name,
        dataType: normalizeDataType(native),
        nativeDataType: native,
        nullable: col.is_nullable === 'YES',
        isPrimaryKey: pk.has(col.column_name),
        isForeignKey: fk.has(col.column_name),
        defaultValue: col.column_default ?? undefined,
      };
    });
  }

  async getRelationships(): Promise<DatabaseRelationship[]> {
    const client = this.requireClient();
    const result = await client.query<{
      source_schema: string;
      source_table: string;
      source_column: string;
      target_schema: string;
      target_table: string;
      target_column: string;
    }>(
      `SELECT
         tc.table_schema AS source_schema,
         tc.table_name AS source_table,
         kcu.column_name AS source_column,
         ccu.table_schema AS target_schema,
         ccu.table_name AS target_table,
         ccu.column_name AS target_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'`,
    );

    return result.rows.map((r) => ({
      sourceSchema: r.source_schema,
      sourceTable: r.source_table,
      sourceColumn: r.source_column,
      targetSchema: r.target_schema,
      targetTable: r.target_table,
      targetColumn: r.target_column,
      confidence: 1,
      source: 'database' as const,
    }));
  }

  async introspect(): Promise<IntrospectionResult> {
    const schemas = await this.getSchemas();
    const preferred = this.config?.schema;
    const schemaNames = preferred
      ? schemas.filter((s) => s.name === preferred)
      : schemas;

    const tables: DatabaseTable[] = [];
    for (const schema of schemaNames) {
      try {
        tables.push(...(await this.getTables(schema.name)));
      } catch {
        // Skip inaccessible schemas
      }
    }

    const explicit = (await this.getRelationships()).filter((rel) =>
      schemaNames.some((s) => s.name === rel.sourceSchema),
    );
    const inferred = inferRelationshipsFromColumns(tables, explicit);
    const relationships = [...explicit, ...inferred];

    return { schemas: schemaNames, tables, relationships };
  }

  async executeQuery(
    query: CompiledQuery,
    options: QueryExecutionOptions = {},
  ): Promise<QueryResult> {
    const client = this.requireClient();
    const maxRows = options.maxRows ?? 1000;
    const timeoutMs = options.timeoutMs ?? 30_000;
    await client.query(`SET statement_timeout = ${Math.max(1, Math.floor(timeoutMs))}`);
    const result = await withQueryTimeout(
      client.query({
        text: query.sql,
        values: query.params,
        rowMode: 'array',
      }),
      timeoutMs,
      options.signal,
    );
    const truncated = result.rows.length > maxRows;
    const sliced = result.rows.slice(0, maxRows);
    const columns = result.fields.map((f) => f.name);
    const rows = sliced.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        obj[col] = (row as unknown[])[i];
      });
      return obj;
    });
    return { columns, rows, rowCount: rows.length, truncated };
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.end().catch(() => undefined);
      this.client = null;
    }
  }
}

async function probePostgresReadonly(client: pg.Client) {
  try {
    const role = await client.query<{
      is_super: boolean;
      can_createdb: boolean;
      can_create: boolean;
    }>(
      `SELECT
         current_setting('is_superuser') = 'on' AS is_super,
         COALESCE((SELECT rolcreatedb FROM pg_roles WHERE rolname = current_user), false) AS can_createdb,
         has_database_privilege(current_user, current_database(), 'CREATE') AS can_create`,
    );
    const row = role.rows[0];
    if (row?.is_super || row?.can_createdb || row?.can_create) {
      return writableResult();
    }

    const writes = await client.query<{ ok: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.role_table_grants
         WHERE grantee = current_user
           AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
       ) AS ok`,
    );
    if (writes.rows[0]?.ok) return writableResult();
    return readonlyResult();
  } catch {
    // If privilege catalog is inaccessible, do not claim readonly.
    return writableResult();
  }
}

export const postgresqlFactory: ConnectorFactory = {
  type: 'postgresql',
  create: () => new PostgreSQLConnector(),
};
