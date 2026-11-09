import { z } from 'zod';

export const semanticStatuses = ['Proposed', 'Approved', 'Rejected'] as const;

export const createSemanticModelSchema = z.object({
  workspaceId: z.string().uuid(),
  dataSourceId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export const updateSemanticStatusSchema = z.object({
  status: z.enum(semanticStatuses),
});

export const updateSemanticItemSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(semanticStatuses).optional(),
});

export const createMetricSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  expression: z.string().min(1),
  aggregation: z.string().min(1),
  entityName: z.string().optional(),
});

export const createDimensionSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  field: z.string().min(1),
  entityName: z.string().optional(),
});

export const createRelationshipSchema = z.object({
  name: z.string().max(120).optional(),
  fromEntity: z.string().min(1),
  toEntity: z.string().min(1),
  fromField: z.string().min(1),
  toField: z.string().min(1),
});

export const createEntitySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  tableRef: z.string().min(1),
});

export const proposeSemanticModelSchema = z
  .object({
    provider: z.enum(['openai', 'openrouter']).optional(),
    useAi: z.boolean().optional().default(true),
  })
  .default({});

export type CreateSemanticModelInput = z.infer<typeof createSemanticModelSchema>;
export type UpdateSemanticStatusInput = z.infer<typeof updateSemanticStatusSchema>;
