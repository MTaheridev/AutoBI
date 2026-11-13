import type { DatabaseRelationship, DatabaseTable } from './types.js';

function singularize(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith('ies') && n.length > 3) return `${n.slice(0, -3)}y`;
  if (n.endsWith('sses') || n.endsWith('xes') || n.endsWith('zes') || n.endsWith('ches')) {
    return n.slice(0, -2);
  }
  if (n.endsWith('ses') && n.length > 3) return n.slice(0, -2);
  if (n.endsWith('s') && !n.endsWith('ss') && n.length > 2) return n.slice(0, -1);
  return n;
}

function pluralize(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith('y') && n.length > 1 && !/[aeiou]y$/.test(n)) return `${n.slice(0, -1)}ies`;
  if (n.endsWith('s') || n.endsWith('x') || n.endsWith('z') || n.endsWith('ch') || n.endsWith('sh')) {
    return `${n}es`;
  }
  return `${n}s`;
}

const KEY_SUFFIXES: Array<{ suffix: string; targetColumns: string[] }> = [
  { suffix: '_id', targetColumns: ['id'] },
  { suffix: '_uid', targetColumns: ['uid', 'id'] },
  { suffix: '_uuid', targetColumns: ['uuid', 'uid', 'id'] },
];

/**
 * Infer FK-like relationships from `*_id` / `*_uid` / `*_uuid` columns when no explicit FK exists.
 * Examples: purchases.store_id → stores.id, purchases.store_uid → stores.uid
 */
export function inferRelationshipsFromColumns(
  tables: DatabaseTable[],
  existing: DatabaseRelationship[] = [],
): DatabaseRelationship[] {
  const existingKeys = new Set(
    existing.map(
      (r) =>
        `${r.sourceSchema}.${r.sourceTable}.${r.sourceColumn}->${r.targetSchema}.${r.targetTable}.${r.targetColumn}`,
    ),
  );

  const tablesBySchema = new Map<string, DatabaseTable[]>();
  for (const table of tables) {
    const list = tablesBySchema.get(table.schema) ?? [];
    list.push(table);
    tablesBySchema.set(table.schema, list);
  }

  const inferred: DatabaseRelationship[] = [];

  for (const table of tables) {
    const peers = tablesBySchema.get(table.schema) ?? [];
    for (const col of table.columns) {
      const lower = col.name.toLowerCase();
      const matched = KEY_SUFFIXES.find(
        (entry) => lower.endsWith(entry.suffix) && lower !== entry.suffix.slice(1),
      );
      if (!matched) continue;
      const base = lower.slice(0, -matched.suffix.length);
      if (!base) continue;

      const candidates = [base, pluralize(base), singularize(base), `${base}s`, `${base}es`];
      const uniqueCandidates = [...new Set(candidates)];

      for (const peer of peers) {
        if (peer.name === table.name) continue;
        const peerLower = peer.name.toLowerCase();
        if (!uniqueCandidates.includes(peerLower)) continue;
        const targetCol = peer.columns.find((c) =>
          matched.targetColumns.includes(c.name.toLowerCase()),
        );
        if (!targetCol) continue;

        const key = `${table.schema}.${table.name}.${col.name}->${peer.schema}.${peer.name}.${targetCol.name}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        inferred.push({
          sourceSchema: table.schema,
          sourceTable: table.name,
          sourceColumn: col.name,
          targetSchema: peer.schema,
          targetTable: peer.name,
          targetColumn: targetCol.name,
          confidence: 0.75,
          source: 'inferred',
        });
        break;
      }
    }
  }

  return inferred;
}
