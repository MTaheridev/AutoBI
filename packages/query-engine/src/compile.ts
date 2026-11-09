import { ValidationError } from '@autobi/shared';
import type { QueryCompileContext } from './context.js';
import { tableKey } from './context.js';
import { parseFieldRef, quoteField, quoteIdent, quoteTable } from './identifiers.js';
import type { ConnectorDialect, QueryPlan } from './plan.js';
import { resolveQueryPlan, type ResolvedPlan } from './resolve.js';
import { assertSafeSelectSql, MAX_LIMIT } from './safety.js';

export interface CompiledQueryPlan {
  sql: string;
  params: unknown[];
  dialect: ConnectorDialect;
}

function placeholder(dialect: ConnectorDialect, index: number): string {
  if (dialect === 'postgresql') return `$${index}`;
  if (dialect === 'sqlserver') return `@p${index}`;
  return '?';
}

function aggregateExpr(aggregation: string, fieldSql: string): string {
  switch (aggregation) {
    case 'sum':
      return `SUM(${fieldSql})`;
    case 'avg':
      return `AVG(${fieldSql})`;
    case 'min':
      return `MIN(${fieldSql})`;
    case 'max':
      return `MAX(${fieldSql})`;
    case 'count':
      return `COUNT(${fieldSql})`;
    case 'count_distinct':
      return `COUNT(DISTINCT ${fieldSql})`;
    default:
      throw new ValidationError(`Unsupported aggregation: ${aggregation}`);
  }
}

function dateTrunc(dialect: ConnectorDialect, granularity: string, fieldSql: string): string {
  if (dialect === 'postgresql') {
    return `DATE_TRUNC('${granularity}', ${fieldSql})`;
  }
  if (dialect === 'sqlserver') {
    const map: Record<string, string> = {
      day: 'day',
      week: 'week',
      month: 'month',
      year: 'year',
    };
    const g = map[granularity];
    return `DATEADD(${g}, DATEDIFF(${g}, 0, ${fieldSql}), 0)`;
  }
  if (granularity === 'year') return `DATE_FORMAT(${fieldSql}, '%Y-01-01')`;
  if (granularity === 'month') return `DATE_FORMAT(${fieldSql}, '%Y-%m-01')`;
  if (granularity === 'week') return `DATE_SUB(${fieldSql}, INTERVAL WEEKDAY(${fieldSql}) DAY)`;
  return `DATE(${fieldSql})`;
}

export function compileResolvedPlan(
  plan: ResolvedPlan,
  ctx: QueryCompileContext,
): CompiledQueryPlan {
  const dialect = ctx.dialect;
  const params: unknown[] = [];

  const selectParts: string[] = [];
  const groupParts: string[] = [];
  const tables = new Map<string, { schema?: string; table: string }>();

  for (const dim of plan.dimensions) {
    const ref = parseFieldRef(dim.field);
    tables.set(tableKey(ref.schema, ref.table), { schema: ref.schema, table: ref.table });
    const fieldSql = quoteField(dialect, ref);
    const expr = dim.granularity ? dateTrunc(dialect, dim.granularity, fieldSql) : fieldSql;
    selectParts.push(`${expr} AS ${quoteIdent(dialect, dim.alias)}`);
    groupParts.push(expr);
  }

  for (const metric of plan.metrics) {
    const ref = parseFieldRef(metric.expression);
    tables.set(tableKey(ref.schema, ref.table), { schema: ref.schema, table: ref.table });
    const fieldSql = quoteField(dialect, ref);
    selectParts.push(
      `${aggregateExpr(metric.aggregation, fieldSql)} AS ${quoteIdent(dialect, metric.alias)}`,
    );
  }

  if (!tables.size) {
    throw new ValidationError('Query plan references no tables');
  }

  if (tables.size > 1) {
    throw new ValidationError(
      'Multi-table query plans are not supported yet. Use fields from a single table.',
    );
  }

  const fromTable = [...tables.values()][0]!;
  const fromSql = quoteTable(dialect, fromTable);

  const whereParts: string[] = [];
  for (const filter of plan.filters) {
    const ref = parseFieldRef(filter.field);
    const fieldSql = quoteField(dialect, ref);
    switch (filter.operator) {
      case 'eq':
        params.push(filter.value);
        whereParts.push(`${fieldSql} = ${placeholder(dialect, params.length)}`);
        break;
      case 'neq':
        params.push(filter.value);
        whereParts.push(`${fieldSql} <> ${placeholder(dialect, params.length)}`);
        break;
      case 'gt':
        params.push(filter.value);
        whereParts.push(`${fieldSql} > ${placeholder(dialect, params.length)}`);
        break;
      case 'gte':
        params.push(filter.value);
        whereParts.push(`${fieldSql} >= ${placeholder(dialect, params.length)}`);
        break;
      case 'lt':
        params.push(filter.value);
        whereParts.push(`${fieldSql} < ${placeholder(dialect, params.length)}`);
        break;
      case 'lte':
        params.push(filter.value);
        whereParts.push(`${fieldSql} <= ${placeholder(dialect, params.length)}`);
        break;
      case 'like':
        params.push(filter.value);
        whereParts.push(`${fieldSql} LIKE ${placeholder(dialect, params.length)}`);
        break;
      case 'in': {
        if (!Array.isArray(filter.value) || !filter.value.length) {
          throw new ValidationError('IN filter requires a non-empty array');
        }
        const marks = filter.value.map((v) => {
          params.push(v);
          return placeholder(dialect, params.length);
        });
        whereParts.push(`${fieldSql} IN (${marks.join(', ')})`);
        break;
      }
      case 'is_null':
        whereParts.push(`${fieldSql} IS NULL`);
        break;
      case 'is_not_null':
        whereParts.push(`${fieldSql} IS NOT NULL`);
        break;
      default:
        throw new ValidationError(`Unsupported operator: ${filter.operator}`);
    }
  }

  const orderParts: string[] = [];
  for (const sort of plan.sort) {
    orderParts.push(`${quoteIdent(dialect, sort.field)} ${sort.direction}`);
  }

  const selectList = selectParts.join(', ');
  const top = dialect === 'sqlserver' ? `TOP (${Math.min(plan.limit, MAX_LIMIT)}) ` : '';

  let sql = `SELECT ${top}${selectList} FROM ${fromSql}`;
  if (whereParts.length) sql += ` WHERE ${whereParts.join(' AND ')}`;
  if (groupParts.length) sql += ` GROUP BY ${groupParts.join(', ')}`;
  if (orderParts.length) sql += ` ORDER BY ${orderParts.join(', ')}`;

  if (dialect !== 'sqlserver') {
    params.push(Math.min(plan.limit, MAX_LIMIT));
    sql += ` LIMIT ${placeholder(dialect, params.length)}`;
  }

  assertSafeSelectSql(sql);
  return { sql, params, dialect };
}

export function buildCompiledQuery(plan: QueryPlan, ctx: QueryCompileContext): CompiledQueryPlan {
  return compileResolvedPlan(resolveQueryPlan(plan, ctx), ctx);
}
