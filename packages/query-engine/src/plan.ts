import { z } from 'zod';

export const filterOperators = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'like',
  'is_null',
  'is_not_null',
] as const;

export const aggregations = ['sum', 'avg', 'count', 'min', 'max', 'count_distinct'] as const;

export const queryPlanSchema = z.object({
  dataSourceId: z.string().uuid(),
  metrics: z
    .array(
      z.object({
        metricId: z.string().uuid().optional(),
        expression: z.string().min(1).optional(),
        aggregation: z.enum(aggregations),
        alias: z.string().min(1).max(64),
      }),
    )
    .min(1),
  dimensions: z
    .array(
      z.object({
        field: z.string().min(1),
        granularity: z.enum(['day', 'week', 'month', 'year']).optional(),
        alias: z.string().min(1).max(64),
      }),
    )
    .default([]),
  filters: z
    .array(
      z.object({
        field: z.string().min(1),
        operator: z.enum(filterOperators),
        value: z.unknown().optional(),
      }),
    )
    .default([]),
  sort: z
    .array(
      z.object({
        field: z.string().min(1),
        direction: z.enum(['ASC', 'DESC']),
      }),
    )
    .default([]),
  limit: z.number().int().positive().max(10_000).default(1000),
});

export type QueryPlan = z.infer<typeof queryPlanSchema>;

export type ConnectorDialect = 'postgresql' | 'mysql' | 'mariadb' | 'sqlserver';
