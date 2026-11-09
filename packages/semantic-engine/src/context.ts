import type { SchemaSnapshotSummary } from './types.js';

/** Compact schema context for AI prompts — metadata only, no row samples. */
export function buildSchemaContext(snapshot: SchemaSnapshotSummary, maxTables = 40): string {
  const tables = snapshot.tables.slice(0, maxTables);
  const lines: string[] = ['Schemas: ' + snapshot.schemas.join(', ')];

  for (const table of tables) {
    const cols = table.columns
      .map((c) => {
        const flags = [
          c.isPrimaryKey ? 'PK' : null,
          c.isForeignKey ? 'FK' : null,
          c.nullable === false ? 'NOT NULL' : null,
        ]
          .filter(Boolean)
          .join(',');
        return `${c.name}:${c.dataType}${flags ? `{${flags}}` : ''}`;
      })
      .join(', ');
    lines.push(`${table.schema}.${table.name} (${table.type}): ${cols}`);
  }

  if (snapshot.tables.length > maxTables) {
    lines.push(`...and ${snapshot.tables.length - maxTables} more tables omitted`);
  }

  for (const rel of snapshot.relationships.slice(0, 50)) {
    lines.push(
      `FK ${rel.sourceSchema}.${rel.sourceTable}.${rel.sourceColumn} -> ${rel.targetSchema}.${rel.targetTable}.${rel.targetColumn}`,
    );
  }

  return lines.join('\n');
}
