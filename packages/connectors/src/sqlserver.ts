import {
  Connection,
  Request,
  TYPES,
  type ConnectionConfiguration,
} from 'tedious';
import { ConnectorError } from '@autobi/shared';
import { normalizeDataType } from './normalize.js';
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

interface TediousColumn {
  metadata: { colName: string };
  value: unknown;
}

function buildTediousConfig(config: ConnectionConfig): ConnectionConfiguration {
  return {
    server: config.host,
    authentication: {
      type: 'default',
      options: {
        userName: config.username,
        password: config.password,
      },
    },
    options: {
      port: config.port,
      database: config.database,
      encrypt: config.ssl ?? false,
      trustServerCertificate: true,
      connectTimeout: config.connectionTimeoutMs ?? 10_000,
      requestTimeout: 30_000,
      rowCollectionOnRequestCompletion: true,
    },
  };
}

function inferTediousType(value: unknown) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? TYPES.Int : TYPES.Float;
  }
  if (typeof value === 'boolean') return TYPES.Bit;
  if (value instanceof Date) return TYPES.DateTime;
  return TYPES.NVarChar;
}

function execSql<T extends Record<string, unknown>>(
  connection: Connection,
  sql: string,
  params: Array<{ name: string; type: unknown; value: unknown }> = [],
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const rows: T[] = [];
    const request = new Request(sql, (error) => {
      if (error) reject(error);
      else resolve(rows);
    });

    for (const param of params) {
      request.addParameter(param.name, param.type as typeof TYPES.NVarChar, param.value);
    }

    request.on('row', (columns: TediousColumn[]) => {
      const row: Record<string, unknown> = {};
      for (const col of columns) {
        row[col.metadata.colName] = col.value;
      }
      rows.push(row as T);
    });

    connection.execSql(request);
  });
}

function connectOnce(config: ConnectionConfig): Promise<Connection> {
  return new Promise((resolve, reject) => {
    const connection = new Connection(buildTediousConfig(config));
    connection.on('connect', (error) => {
      if (error) reject(error);
      else resolve(connection);
    });
    connection.connect();
  });
}

export class SQLServerConnector implements DatabaseConnector {
  readonly type = 'sqlserver' as const;
  private connection: Connection | null = null;
  private config: ConnectionConfig | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    await this.close();
    this.config = config;
    this.connection = await connectOnce(config);
  }

  private requireConnection(): Connection {
    if (!this.connection) throw new ConnectorError('SQL Server connector is not connected');
    return this.connection;
  }

  async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    const started = Date.now();
    let connection: Connection | undefined;
    try {
      connection = await connectOnce(config);
      const rows = await execSql<{ version: string }>(connection, 'SELECT @@VERSION AS version');
      return {
        ok: true,
        message: 'Connection successful',
        latencyMs: Date.now() - started,
        serverVersion: rows[0]?.version ?? '',
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Connection failed',
        latencyMs: Date.now() - started,
      };
    } finally {
      connection?.close();
    }
  }

  async getSchemas(): Promise<DatabaseSchema[]> {
    const connection = this.requireConnection();
    const rows = await execSql<{ name: string }>(
      connection,
      `SELECT name FROM sys.schemas
       WHERE name NOT IN ('sys', 'INFORMATION_SCHEMA', 'guest', 'db_owner', 'db_accessadmin',
         'db_securityadmin', 'db_ddladmin', 'db_backupoperator', 'db_datareader',
         'db_datawriter', 'db_denydatareader', 'db_denydatawriter')
       ORDER BY name`,
    );
    return rows.map((r) => ({ name: String(r.name) }));
  }

  async getTables(schema: string): Promise<DatabaseTable[]> {
    const connection = this.requireConnection();
    const tableRows = await execSql<{ name: string; type: string }>(
      connection,
      `SELECT t.name AS name, t.type AS type
       FROM sys.tables t
       INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
       WHERE s.name = @schema
       UNION ALL
       SELECT v.name AS name, 'V' AS type
       FROM sys.views v
       INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
       WHERE s.name = @schema
       ORDER BY name`,
      [{ name: 'schema', type: TYPES.NVarChar, value: schema }],
    );

    const tables: DatabaseTable[] = [];
    for (const row of tableRows) {
      const name = String(row.name);
      const columns = await this.getColumns(schema, name);
      tables.push({
        schema,
        name,
        type: String(row.type).trim() === 'V' ? 'view' : 'table',
        columns,
      });
    }
    return tables;
  }

  async getColumns(schema: string, table: string): Promise<DatabaseColumn[]> {
    const connection = this.requireConnection();
    const columns = await execSql<{
      name: string;
      data_type: string;
      is_nullable: boolean;
      column_default: string | null;
      is_primary_key: number;
      is_foreign_key: number;
    }>(
      connection,
      `SELECT
         c.name AS name,
         ty.name AS data_type,
         c.is_nullable AS is_nullable,
         dc.definition AS column_default,
         CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END AS is_primary_key,
         CASE WHEN fk.parent_column_id IS NULL THEN 0 ELSE 1 END AS is_foreign_key
       FROM sys.columns c
       INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
       INNER JOIN sys.objects o ON c.object_id = o.object_id
       INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
       LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
       LEFT JOIN (
         SELECT ic.object_id, ic.column_id
         FROM sys.indexes i
         INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
         WHERE i.is_primary_key = 1
       ) pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
       LEFT JOIN sys.foreign_key_columns fk
         ON fk.parent_object_id = c.object_id AND fk.parent_column_id = c.column_id
       WHERE s.name = @schema AND o.name = @table
       ORDER BY c.column_id`,
      [
        { name: 'schema', type: TYPES.NVarChar, value: schema },
        { name: 'table', type: TYPES.NVarChar, value: table },
      ],
    );

    return columns.map((col) => ({
      name: String(col.name),
      dataType: normalizeDataType(String(col.data_type)),
      nativeDataType: String(col.data_type),
      nullable: Boolean(col.is_nullable),
      isPrimaryKey: Number(col.is_primary_key) === 1,
      isForeignKey: Number(col.is_foreign_key) === 1,
      defaultValue: col.column_default ?? undefined,
    }));
  }

  async getRelationships(): Promise<DatabaseRelationship[]> {
    const connection = this.requireConnection();
    const rows = await execSql<{
      source_schema: string;
      source_table: string;
      source_column: string;
      target_schema: string;
      target_table: string;
      target_column: string;
    }>(
      connection,
      `SELECT
         ps.name AS source_schema,
         pt.name AS source_table,
         pc.name AS source_column,
         rs.name AS target_schema,
         rt.name AS target_table,
         rc.name AS target_column
       FROM sys.foreign_key_columns fkc
       INNER JOIN sys.tables pt ON fkc.parent_object_id = pt.object_id
       INNER JOIN sys.schemas ps ON pt.schema_id = ps.schema_id
       INNER JOIN sys.columns pc ON fkc.parent_object_id = pc.object_id AND fkc.parent_column_id = pc.column_id
       INNER JOIN sys.tables rt ON fkc.referenced_object_id = rt.object_id
       INNER JOIN sys.schemas rs ON rt.schema_id = rs.schema_id
       INNER JOIN sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id`,
    );

    return rows.map((r) => ({
      sourceSchema: String(r.source_schema),
      sourceTable: String(r.source_table),
      sourceColumn: String(r.source_column),
      targetSchema: String(r.target_schema),
      targetTable: String(r.target_table),
      targetColumn: String(r.target_column),
      confidence: 1,
      source: 'database' as const,
    }));
  }

  async introspect(): Promise<IntrospectionResult> {
    const schemas = await this.getSchemas();
    const preferred = this.config?.schema ?? 'dbo';
    const schemaNames = schemas.filter((s) => s.name === preferred);
    const effective = schemaNames.length ? schemaNames : schemas.filter((s) => s.name === 'dbo');

    const tables: DatabaseTable[] = [];
    for (const schema of effective) {
      try {
        tables.push(...(await this.getTables(schema.name)));
      } catch {
        // Skip inaccessible schemas
      }
    }

    const relationships = (await this.getRelationships()).filter((rel) =>
      effective.some((s) => s.name === rel.sourceSchema),
    );

    return { schemas: effective, tables, relationships };
  }

  async executeQuery(
    query: CompiledQuery,
    options: QueryExecutionOptions = {},
  ): Promise<QueryResult> {
    const connection = this.requireConnection();
    const maxRows = options.maxRows ?? 1000;
    const params = (query.params ?? []).map((value, index) => ({
      name: `p${index + 1}`,
      type: inferTediousType(value),
      value,
    }));
    const rows = await execSql<Record<string, unknown>>(connection, query.sql, params);
    const truncated = rows.length > maxRows;
    const sliced = rows.slice(0, maxRows);
    const columns = sliced[0] ? Object.keys(sliced[0]) : [];
    return { columns, rows: sliced, rowCount: sliced.length, truncated };
  }

  async close(): Promise<void> {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }
}

export const sqlserverFactory: ConnectorFactory = {
  type: 'sqlserver',
  create: () => new SQLServerConnector(),
};
