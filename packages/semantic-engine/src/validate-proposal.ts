import { ValidationError } from '@autobi/shared';
import type { SchemaSnapshotSummary, SemanticProposal } from './types.js';

const AGGREGATIONS = new Set(['sum', 'avg', 'min', 'max', 'count', 'count_distinct']);

function tableKey(schema: string | undefined, name: string) {
  return schema ? `${schema}.${name}` : name;
}

function parseTableRef(ref: string): { schema?: string; table: string } {
  const parts = ref.split('.');
  if (parts.length === 1) return { table: parts[0]! };
  if (parts.length === 2) return { schema: parts[0], table: parts[1]! };
  throw new ValidationError(`Invalid tableRef: ${ref}`);
}

function parseField(field: string): { schema?: string; table: string; column: string } {
  const parts = field.split('.');
  if (parts.length === 2) return { table: parts[0]!, column: parts[1]! };
  if (parts.length === 3) return { schema: parts[0], table: parts[1]!, column: parts[2]! };
  throw new ValidationError(`Invalid field: ${field}`);
}

/** Ensure AI/heuristic proposals only reference tables/columns that exist in the snapshot. */
export function validateProposalAgainstSnapshot(
  proposal: SemanticProposal,
  snapshot: SchemaSnapshotSummary,
): void {
  const tables = new Map(
    snapshot.tables.map((t) => [tableKey(t.schema, t.name), t]),
  );
  const entityTables = new Map<string, string>();

  for (const entity of proposal.entities) {
    const ref = parseTableRef(entity.tableRef);
    const key = tableKey(ref.schema, ref.table);
    const alt = tableKey(undefined, ref.table);
    const table = tables.get(key) ?? tables.get(alt);
    if (!table) {
      throw new ValidationError(`Unknown table in entity ${entity.name}: ${entity.tableRef}`);
    }
    entityTables.set(entity.name, tableKey(table.schema, table.name));
  }

  const resolveField = (field: string, label: string) => {
    const ref = parseField(field);
    const key = tableKey(ref.schema, ref.table);
    const alt = tableKey(undefined, ref.table);
    const table = tables.get(key) ?? tables.get(alt);
    if (!table) {
      throw new ValidationError(`Unknown table in ${label}: ${field}`);
    }
    if (!table.columns.some((c) => c.name === ref.column)) {
      throw new ValidationError(`Unknown column in ${label}: ${field}`);
    }
  };

  for (const metric of proposal.metrics) {
    if (!AGGREGATIONS.has(metric.aggregation.toLowerCase())) {
      throw new ValidationError(`Unsupported aggregation: ${metric.aggregation}`);
    }
    resolveField(metric.expression, `metric ${metric.name}`);
  }

  for (const dim of proposal.dimensions) {
    resolveField(dim.field, `dimension ${dim.name}`);
  }

  for (const rel of proposal.relationships) {
    resolveField(rel.fromField, `relationship ${rel.name ?? 'unnamed'}`);
    resolveField(rel.toField, `relationship ${rel.name ?? 'unnamed'}`);
  }
}
