import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { ConnectorError } from '@autobi/shared';
import { normalizeDataType } from './normalize.js';
import type {
  CompiledQuery,
  ConnectionConfig,
  ConnectionTestResult,
  ConnectorType,
  DatabaseColumn,
  DatabaseConnector,
  DatabaseRelationship,
  DatabaseSchema,
  DatabaseTable,
  IntrospectionResult,
  QueryExecutionOptions,
  QueryResult,
} from './types.js';

export class MySqlFamilyConnector implements DatabaseConnector {
  private connection: Connection | null = null;
  private config: ConnectionConfig | null = null;

  constructor(readonly type: ConnectorType) {}

  async connect(config: ConnectionConfig): Promise<void> {
    await this.close();
    this.config = config;
    this.connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? {} : undefined,
      connectTimeout: config.connectionTimeoutMs ?? 10_000,
    });
  }

  private requireConnection(): Connection {
    if (!this.connection) {
      throw new ConnectorError(`${this.type} connector is not connected`);
    }
    return this.connection;
  }

  async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    const started = Date.now();
    let connection: Connection | undefined;
    try {
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl ? {} : undefined,
        connectTimeout: config.connectionTimeoutMs ?? 10_000,
      });
      const [rows] = await connection.query<RowDataPacket[]>('SELECT VERSION() AS version');
      return {
        ok: true,
        message: 'Connection successful',
        latencyMs: Date.now() - started,
        serverVersion: String(rows[0]?.version ?? ''),
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Connection failed',
        latencyMs: Date.now() - started,
      };
    } finally {
      await connection?.end().catch(() => undefined);
    }
  }

  async getSchemas(): Promise<DatabaseSchema[]> {
    const connection = this.requireConnection();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT SCHEMA_NAME AS name
       FROM information_schema.SCHEMATA
       WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
       ORDER BY SCHEMA_NAME`,
    );
    return rows.map((r) => ({ name: String(r.name) }));
  }

  async getTables(schema: string): Promise<DatabaseTable[]> {
    const connection = this.requireConnection();
    const [tableRows] = await connection.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS name, TABLE_TYPE AS type
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
         AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
       ORDER BY TABLE_NAME`,
      [schema],
    );

    const tables: DatabaseTable[] = [];
    for (const row of tableRows) {
      const name = String(row.name);
      const columns = await this.getColumns(schema, name);
      tables.push({
        schema,
        name,
        type: String(row.type) === 'VIEW' ? 'view' : 'table',
        columns,
      });
    }
    return tables;
  }

  async getColumns(schema: string, table: string): Promise<DatabaseColumn[]> {
    const connection = this.requireConnection();
    const [columns] = await connection.query<RowDataPacket[]>(
      `SELECT
         COLUMN_NAME AS name,
         DATA_TYPE AS data_type,
         COLUMN_TYPE AS column_type,
         IS_NULLABLE AS is_nullable,
         COLUMN_DEFAULT AS column_default,
         COLUMN_KEY AS column_key
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [schema, table],
    );

    return columns.map((col) => {
      const native = String(col.column_type || col.data_type);
      const key = String(col.column_key ?? '');
      return {
        name: String(col.name),
        dataType: normalizeDataType(String(col.data_type)),
        nativeDataType: native,
        nullable: String(col.is_nullable) === 'YES',
        isPrimaryKey: key === 'PRI',
        isForeignKey: key === 'MUL',
        defaultValue: col.column_default == null ? undefined : String(col.column_default),
      };
    });
  }

  async getRelationships(): Promise<DatabaseRelationship[]> {
    const connection = this.requireConnection();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
         kcu.TABLE_SCHEMA AS source_schema,
         kcu.TABLE_NAME AS source_table,
         kcu.COLUMN_NAME AS source_column,
         kcu.REFERENCED_TABLE_SCHEMA AS target_schema,
         kcu.REFERENCED_TABLE_NAME AS target_table,
         kcu.REFERENCED_COLUMN_NAME AS target_column
       FROM information_schema.KEY_COLUMN_USAGE kcu
       WHERE kcu.REFERENCED_TABLE_NAME IS NOT NULL`,
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
    const preferred = this.config?.schema ?? this.config?.database;
    const schemaNames = preferred
      ? schemas.filter((s) => s.name === preferred)
      : schemas.length
        ? schemas
        : this.config?.database
          ? [{ name: this.config.database }]
          : [];

    const tables: DatabaseTable[] = [];
    for (const schema of schemaNames) {
      try {
        tables.push(...(await this.getTables(schema.name)));
      } catch {
        // Skip inaccessible schemas
      }
    }

    const relationships = (await this.getRelationships()).filter((rel) =>
      schemaNames.some((s) => s.name === rel.sourceSchema),
    );

    return { schemas: schemaNames, tables, relationships };
  }

  async executeQuery(
    query: CompiledQuery,
    options: QueryExecutionOptions = {},
  ): Promise<QueryResult> {
    const connection = this.requireConnection();
    const maxRows = options.maxRows ?? 1000;
    const [rows, fields] = await connection.query({
      sql: query.sql,
      values: query.params,
    });
    const list = Array.isArray(rows) ? (rows as RowDataPacket[]) : [];
    const truncated = list.length > maxRows;
    const sliced = list.slice(0, maxRows);
    const columns = (fields as Array<{ name: string }> | undefined)?.map((f) => f.name) ?? [];
    return {
      columns,
      rows: sliced.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const col of columns) obj[col] = row[col];
        return obj;
      }),
      rowCount: sliced.length,
      truncated,
    };
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end().catch(() => undefined);
      this.connection = null;
    }
  }
}
