import { describe, expect, it } from 'vitest';
import { resolveQueryPlan } from './resolve.js';
import { queryPlanSchema } from './plan.js';

describe('resolveQueryPlan preferApprovedSemantics', () => {
  it('does not fall back to Proposed metrics', () => {
    const plan = queryPlanSchema.parse({
      dataSourceId: '22222222-2222-2222-2222-222222222222',
      metrics: [
        {
          metricId: '11111111-1111-1111-1111-111111111111',
          aggregation: 'sum',
          alias: 'revenue',
        },
      ],
      dimensions: [],
      filters: [],
      sort: [],
      limit: 10,
    });

    expect(() =>
      resolveQueryPlan(plan, {
        dialect: 'postgresql',
        preferApprovedSemantics: true,
        tables: [
          {
            schema: 'public',
            name: 'orders',
            columns: [{ name: 'amount' }],
          },
        ],
        metrics: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Revenue',
            expression: 'public.orders.amount',
            aggregation: 'sum',
            status: 'Proposed',
          },
        ],
      }),
    ).toThrow(/unapproved metricId/);
  });
});
