import { z } from 'zod';

export const semanticStatuses = ['Proposed', 'Approved', 'Rejected'] as const;
export type SemanticStatus = (typeof semanticStatuses)[number];

export const semanticSources = ['ai', 'user', 'inferred'] as const;
export type SemanticSource = (typeof semanticSources)[number];

export const proposedEntitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  tableRef: z.string().min(1),
});

export const proposedMetricSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  expression: z.string().min(1),
  aggregation: z.string().min(1),
  entityName: z.string().optional(),
});

export const proposedDimensionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  field: z.string().min(1),
  entityName: z.string().optional(),
});

export const proposedRelationshipSchema = z.object({
  name: z.string().optional(),
  fromEntity: z.string().min(1),
  toEntity: z.string().min(1),
  fromField: z.string().min(1),
  toField: z.string().min(1),
});

export const semanticProposalSchema = z.object({
  entities: z.array(proposedEntitySchema).default([]),
  metrics: z.array(proposedMetricSchema).default([]),
  dimensions: z.array(proposedDimensionSchema).default([]),
  relationships: z.array(proposedRelationshipSchema).default([]),
}).transform((value) => ({
  entities: value.entities ?? [],
  metrics: value.metrics ?? [],
  dimensions: value.dimensions ?? [],
  relationships: value.relationships ?? [],
}));

export type ProposedEntity = z.infer<typeof proposedEntitySchema>;
export type ProposedMetric = z.infer<typeof proposedMetricSchema>;
export type ProposedDimension = z.infer<typeof proposedDimensionSchema>;
export type ProposedRelationship = z.infer<typeof proposedRelationshipSchema>;
export type SemanticProposal = z.infer<typeof semanticProposalSchema>;

export interface SchemaColumnSummary {
  name: string;
  dataType: string;
  nativeDataType?: string;
  nullable?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

export interface SchemaTableSummary {
  schema: string;
  name: string;
  type: 'table' | 'view';
  columns: SchemaColumnSummary[];
}

export interface SchemaRelationshipSummary {
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
}

export interface SchemaSnapshotSummary {
  schemas: string[];
  tables: SchemaTableSummary[];
  relationships: SchemaRelationshipSummary[];
}

export interface StatusedItem {
  status: SemanticStatus;
}
