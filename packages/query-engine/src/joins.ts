import { ValidationError } from '@autobi/shared';
import type { SchemaRelationshipAllow } from './context.js';
import { tableKey } from './context.js';
import type { ConnectorDialect } from './plan.js';
import { quoteField, quoteTable } from './identifiers.js';

export type TableRef = { schema?: string; table: string };

type Edge = {
  left: TableRef;
  right: TableRef;
  leftColumn: string;
  rightColumn: string;
};

function normKey(schema: string | undefined, table: string): string {
  return tableKey(schema, table);
}

function undirectedEdges(relationships: SchemaRelationshipAllow[]): Edge[] {
  const edges: Edge[] = [];
  for (const rel of relationships) {
    edges.push({
      left: { schema: rel.sourceSchema, table: rel.sourceTable },
      right: { schema: rel.targetSchema, table: rel.targetTable },
      leftColumn: rel.sourceColumn,
      rightColumn: rel.targetColumn,
    });
  }
  return edges;
}

/**
 * Build INNER JOIN clauses connecting all required tables via FK / semantic relationships.
 * Uses BFS spanning tree. Fails if the join graph cannot connect every table.
 */
export function buildJoinSql(
  dialect: ConnectorDialect,
  required: TableRef[],
  relationships: SchemaRelationshipAllow[],
): { fromSql: string; joinSql: string } {
  if (!required.length) {
    throw new ValidationError('Query plan references no tables');
  }
  if (required.length === 1) {
    return { fromSql: quoteTable(dialect, required[0]!), joinSql: '' };
  }

  const needed = new Set(required.map((t) => normKey(t.schema, t.table)));
  const byKey = new Map(required.map((t) => [normKey(t.schema, t.table), t]));
  const edges = undirectedEdges(relationships).filter((e) => {
    const a = normKey(e.left.schema, e.left.table);
    const b = normKey(e.right.schema, e.right.table);
    return needed.has(a) && needed.has(b);
  });

  const adj = new Map<string, Edge[]>();
  for (const e of edges) {
    const a = normKey(e.left.schema, e.left.table);
    const b = normKey(e.right.schema, e.right.table);
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(e);
    adj.get(b)!.push(e);
  }

  const rootKey = [...needed][0]!;
  const visited = new Set<string>([rootKey]);
  const joinClauses: string[] = [];
  const queue = [rootKey];

  while (queue.length) {
    const cur = queue.shift()!;
    for (const edge of adj.get(cur) ?? []) {
      const a = normKey(edge.left.schema, edge.left.table);
      const b = normKey(edge.right.schema, edge.right.table);
      const next = a === cur ? b : a;
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);

      const leftOnCur = a === cur;
      const fromSide = leftOnCur ? edge.left : edge.right;
      const toSide = leftOnCur ? edge.right : edge.left;
      const fromCol = leftOnCur ? edge.leftColumn : edge.rightColumn;
      const toCol = leftOnCur ? edge.rightColumn : edge.leftColumn;

      const joinTable = byKey.get(normKey(toSide.schema, toSide.table))!;
      const onLeft = quoteField(dialect, {
        schema: fromSide.schema,
        table: fromSide.table,
        column: fromCol,
      });
      const onRight = quoteField(dialect, {
        schema: toSide.schema,
        table: toSide.table,
        column: toCol,
      });
      joinClauses.push(
        `INNER JOIN ${quoteTable(dialect, joinTable)} ON ${onLeft} = ${onRight}`,
      );
    }
  }

  if (visited.size !== needed.size) {
    const missing = [...needed].filter((k) => !visited.has(k));
    throw new ValidationError(
      `Cannot join tables without a relationship path: ${missing.join(', ')}`,
    );
  }

  const root = byKey.get(rootKey)!;
  return {
    fromSql: quoteTable(dialect, root),
    joinSql: joinClauses.length ? ` ${joinClauses.join(' ')}` : '',
  };
}
