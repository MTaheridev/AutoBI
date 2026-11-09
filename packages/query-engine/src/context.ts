export interface SchemaColumnAllow {
  name: string;
  dataType?: string;
}

export interface SchemaTableAllow {
  schema: string;
  name: string;
  columns: SchemaColumnAllow[];
}

export interface SemanticMetricRef {
  id: string;
  name: string;
  expression: string;
  aggregation: string;
  status: string;
}

export interface SemanticDimensionRef {
  id: string;
  name: string;
  field: string;
  status: string;
}

export interface QueryCompileContext {
  dialect: 'postgresql' | 'mysql' | 'mariadb' | 'sqlserver';
  tables: SchemaTableAllow[];
  metrics?: SemanticMetricRef[];
  dimensions?: SemanticDimensionRef[];
  preferApprovedSemantics?: boolean;
}

export function tableKey(schema: string | undefined, table: string): string {
  return schema ? `${schema}.${table}` : table;
}
