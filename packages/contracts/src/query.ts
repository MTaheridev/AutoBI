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

export const createQuerySchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(120),
  semanticModelId: z.string().uuid().optional(),
  plan: queryPlanSchema,
});

export const updateQuerySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  semanticModelId: z.string().uuid().nullable().optional(),
  plan: queryPlanSchema.optional(),
});

export type CreateQueryInput = z.infer<typeof createQuerySchema>;
export type QueryPlanInput = z.infer<typeof queryPlanSchema>;
