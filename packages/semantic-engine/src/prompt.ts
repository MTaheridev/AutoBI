import { buildSchemaContext } from './context.js';
import type { SchemaSnapshotSummary } from './types.js';

export const SEMANTIC_PROPOSAL_SYSTEM = [
  'You are a business intelligence semantic modeler.',
  'Propose entities, metrics, dimensions, and relationships from database schema metadata only.',
  'Do not invent tables or columns that are not listed.',
  'Respond with JSON matching: { entities, metrics, dimensions, relationships }.',
  'Entities need name, tableRef (schema.table), optional description.',
  'Metrics need name, expression (schema.table.column), aggregation (sum|avg|count|min|max), optional entityName/description.',
  'Dimensions need name, field (schema.table.column), optional entityName/description.',
  'Relationships need fromEntity, toEntity, fromField, toField, optional name.',
  'Keep proposals concise and business-oriented. All proposals are untrusted until a human approves them.',
].join(' ');

export function buildSemanticProposalPrompt(snapshot: SchemaSnapshotSummary): string {
  return [
    'Propose a semantic model for this schema:',
    buildSchemaContext(snapshot),
  ].join('\n\n');
}
