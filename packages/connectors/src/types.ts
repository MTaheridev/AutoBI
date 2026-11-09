export type ConnectorType = 'postgresql' | 'mysql' | 'mariadb' | 'sqlserver';

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  schema?: string;
  connectionTimeoutMs?: number;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
  serverVersion?: string;
}

export interface DatabaseSchema {
  name: string;
}

export interface DatabaseColumn {
  name: string;
  dataType: string;
  nativeDataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: string;
}

export interface DatabaseTable {
  schema: string;
  name: string;
  type: 'table' | 'view';
  columns: DatabaseColumn[];
}

export interface DatabaseRelationship {
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
  confidence: number;
  source: 'database' | 'inferred';
}

export interface CompiledQuery {
  sql: string;
  params: unknown[];
}

export interface QueryExecutionOptions {
  timeoutMs?: number;
  maxRows?: number;
  signal?: AbortSignal;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface IntrospectionResult {
  schemas: DatabaseSchema[];
  tables: DatabaseTable[];
  relationships: DatabaseRelationship[];
}

export interface DatabaseConnector {
  readonly type: ConnectorType;

  connect(config: ConnectionConfig): Promise<void>;

  testConnection(config: ConnectionConfig): Promise<ConnectionTestResult>;

  getSchemas(): Promise<DatabaseSchema[]>;

  getTables(schema: string): Promise<DatabaseTable[]>;

  getColumns(schema: string, table: string): Promise<DatabaseColumn[]>;

  getRelationships(): Promise<DatabaseRelationship[]>;

  introspect(): Promise<IntrospectionResult>;

  executeQuery(query: CompiledQuery, options?: QueryExecutionOptions): Promise<QueryResult>;

  close(): Promise<void>;
}

export interface ConnectorFactory {
  readonly type: ConnectorType;
  create(): DatabaseConnector;
}
