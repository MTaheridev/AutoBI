import type {
  SchemaSnapshotSummary,
  SchemaTableSummary,
  SemanticProposal,
} from './types.js';

function titleCase(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function singularize(name: string): string {
  if (name.endsWith('ies')) return `${name.slice(0, -3)}y`;
  if (name.endsWith('ses') || name.endsWith('xes') || name.endsWith('zes')) {
    return name.slice(0, -2);
  }
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1);
  return name;
}

function isNumeric(dataType: string): boolean {
  return ['integer', 'number'].includes(dataType);
}

function isTemporal(dataType: string): boolean {
  return ['date', 'datetime', 'time'].includes(dataType);
}

function isDimensionLike(col: { name: string; dataType: string; isPrimaryKey?: boolean }): boolean {
  if (col.isPrimaryKey) return false;
  if (isTemporal(col.dataType)) return true;
  if (col.dataType === 'string' || col.dataType === 'boolean') return true;
  const n = col.name.toLowerCase();
  return /status|type|category|region|country|city|name|code/.test(n);
}

function metricAggregation(colName: string): string {
  const n = colName.toLowerCase();
  if (/amount|revenue|price|total|cost|sales/.test(n)) return 'sum';
  if (/qty|quantity|count|num/.test(n)) return 'sum';
  return 'avg';
}

function entityNameFromTable(table: SchemaTableSummary): string {
  return titleCase(singularize(table.name));
}

/** Deterministic proposals from schema metadata (no AI, no row data). */
export function proposeFromSchemaHeuristic(snapshot: SchemaSnapshotSummary): SemanticProposal {
  const entities = snapshot.tables
    .filter((t) => t.type === 'table')
    .slice(0, 30)
    .map((table) => ({
      name: entityNameFromTable(table),
      description: `Business entity mapped from ${table.schema}.${table.name}`,
      tableRef: `${table.schema}.${table.name}`,
    }));

  const entityByTable = new Map(
    entities.map((e) => [e.tableRef, e.name] as const),
  );

  const metrics: SemanticProposal['metrics'] = [];
  const dimensions: SemanticProposal['dimensions'] = [];

  for (const table of snapshot.tables.filter((t) => t.type === 'table').slice(0, 30)) {
    const entityName = entityByTable.get(`${table.schema}.${table.name}`);
    for (const col of table.columns) {
      if (isNumeric(col.dataType) && !col.isPrimaryKey && !col.isForeignKey) {
        metrics.push({
          name: `${entityName ?? titleCase(table.name)} ${titleCase(col.name)}`,
          description: `Proposed metric on ${col.name}`,
          expression: `${table.schema}.${table.name}.${col.name}`,
          aggregation: metricAggregation(col.name),
          entityName,
        });
      }
      if (isDimensionLike(col)) {
        dimensions.push({
          name: `${entityName ?? titleCase(table.name)} ${titleCase(col.name)}`,
          description: `Proposed dimension on ${col.name}`,
          field: `${table.schema}.${table.name}.${col.name}`,
          entityName,
        });
      }
    }
  }

  const relationships = snapshot.relationships.slice(0, 40).map((rel) => {
    const fromRef = `${rel.sourceSchema}.${rel.sourceTable}`;
    const toRef = `${rel.targetSchema}.${rel.targetTable}`;
    return {
      name: `${entityByTable.get(fromRef) ?? titleCase(rel.sourceTable)} to ${entityByTable.get(toRef) ?? titleCase(rel.targetTable)}`,
      fromEntity: entityByTable.get(fromRef) ?? titleCase(singularize(rel.sourceTable)),
      toEntity: entityByTable.get(toRef) ?? titleCase(singularize(rel.targetTable)),
      fromField: `${rel.sourceSchema}.${rel.sourceTable}.${rel.sourceColumn}`,
      toField: `${rel.targetSchema}.${rel.targetTable}.${rel.targetColumn}`,
    };
  });

  return {
    entities,
    metrics: metrics.slice(0, 40),
    dimensions: dimensions.slice(0, 40),
    relationships,
  };
}
