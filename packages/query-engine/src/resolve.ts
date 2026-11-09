import { ValidationError } from '@autobi/shared';
import type { QueryCompileContext } from './context.js';
import { parseFieldRef } from './identifiers.js';
import type { QueryPlan } from './plan.js';

export interface ResolvedMetric {
  expression: string;
  aggregation: string;
  alias: string;
}

export interface ResolvedPlan {
  metrics: ResolvedMetric[];
  dimensions: QueryPlan['dimensions'];
  filters: QueryPlan['filters'];
  sort: QueryPlan['sort'];
  limit: number;
}

function allowField(ctx: QueryCompileContext, field: string): void {
  const ref = parseFieldRef(field);
  const table = ctx.tables.find(
    (t) => t.name === ref.table && (ref.schema ? t.schema === ref.schema : true),
  );
  if (!table) {
    throw new ValidationError(`Table not allowed: ${field}`);
  }
  if (!table.columns.some((c) => c.name === ref.column)) {
    throw new ValidationError(`Column not allowed: ${field}`);
  }
}

function selectMetrics(ctx: QueryCompileContext) {
  const all = ctx.metrics ?? [];
  if (ctx.preferApprovedSemantics) {
    const approved = all.filter((m) => m.status === 'Approved');
    if (approved.length) return approved;
    return all.filter((m) => m.status === 'Proposed');
  }
  return all.filter((m) => m.status !== 'Rejected');
}

export function resolveQueryPlan(plan: QueryPlan, ctx: QueryCompileContext): ResolvedPlan {
  const metricsCatalog = selectMetrics(ctx);

  const resolvedMetrics: ResolvedMetric[] = plan.metrics.map((m) => {
    if (m.metricId) {
      const found = metricsCatalog.find((x) => x.id === m.metricId);
      if (!found) {
        throw new ValidationError(`Unknown or unapproved metricId: ${m.metricId}`);
      }
      allowField(ctx, found.expression);
      return {
        expression: found.expression,
        aggregation: (m.aggregation || found.aggregation).toLowerCase(),
        alias: m.alias,
      };
    }
    if (!m.expression) {
      throw new ValidationError('Metric requires metricId or expression');
    }
    allowField(ctx, m.expression);
    return {
      expression: m.expression,
      aggregation: m.aggregation,
      alias: m.alias,
    };
  });

  for (const dim of plan.dimensions) allowField(ctx, dim.field);
  for (const filter of plan.filters) allowField(ctx, filter.field);

  for (const s of plan.sort) {
    const dimMatch = plan.dimensions.some((d) => d.field === s.field || d.alias === s.field);
    const metricMatch = resolvedMetrics.some((m) => m.alias === s.field);
    if (!dimMatch && !metricMatch) {
      throw new ValidationError(`Sort field must be a selected alias: ${s.field}`);
    }
  }

  return {
    metrics: resolvedMetrics,
    dimensions: plan.dimensions,
    filters: plan.filters,
    sort: plan.sort,
    limit: plan.limit,
  };
}
