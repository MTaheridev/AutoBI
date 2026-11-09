import { z } from 'zod';

export const dataSourceTypes = ['postgresql', 'mysql', 'mariadb', 'sqlserver'] as const;

export const connectionConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().optional(),
  schema: z.string().optional(),
  connectionTimeoutMs: z.number().int().positive().optional(),
});

export const createDataSourceSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(120),
  type: z.enum(dataSourceTypes),
  config: connectionConfigSchema,
});

export const updateDataSourceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  config: connectionConfigSchema.optional(),
});

export const dataSourceSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  type: z.enum(dataSourceTypes),
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  ssl: z.boolean().optional(),
  schema: z.string().optional(),
  connectionStatus: z.enum(['unknown', 'connected', 'failed']),
  introspectionStatus: z.enum(['idle', 'running', 'succeeded', 'failed']),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const databaseColumnSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  nativeDataType: z.string(),
  nullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  defaultValue: z.string().optional(),
});

export const databaseTableSchema = z.object({
  schema: z.string(),
  name: z.string(),
  type: z.enum(['table', 'view']),
  columns: z.array(databaseColumnSchema),
});

export const databaseRelationshipSchema = z.object({
  sourceSchema: z.string(),
  sourceTable: z.string(),
  sourceColumn: z.string(),
  targetSchema: z.string(),
  targetTable: z.string(),
  targetColumn: z.string(),
  confidence: z.number(),
  source: z.enum(['database', 'inferred']),
});

export const schemaSnapshotSchema = z.object({
  id: z.string().uuid(),
  dataSourceId: z.string().uuid(),
  version: z.number(),
  schemas: z.array(z.string()),
  tables: z.array(databaseTableSchema),
  relationships: z.array(databaseRelationshipSchema),
  createdAt: z.string(),
});

export type ConnectionConfig = z.infer<typeof connectionConfigSchema>;
export type CreateDataSourceInput = z.infer<typeof createDataSourceSchema>;
export type UpdateDataSourceInput = z.infer<typeof updateDataSourceSchema>;
export type DataSourceDto = z.infer<typeof dataSourceSchema>;
export type SchemaSnapshotDto = z.infer<typeof schemaSnapshotSchema>;
