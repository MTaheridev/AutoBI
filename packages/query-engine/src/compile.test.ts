import { describe, expect, it } from 'vitest';
import { buildCompiledQuery } from './compile.js';
import { queryPlanSchema } from './plan.js';
import { assertSafeSelectSql } from './safety.js';

const ctx = {
  dialect: 'postgresql' as const,
  preferApprovedSemantics: true,
  tables: [
    {
      schema: 'public',
      name: 'orders',
      columns: [
        { name: 'id' },
        { name: 'amount' },
        { name: 'status' },
        { name: 'created_at' },
      ],
    },
  ],
  metrics: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Revenue',
      expression: 'public.orders.amount',
      aggregation: 'sum',
      status: 'Approved',
    },
  ],
};

describe('buildCompiledQuery', () => {
  it('compiles a parameterized aggregate query', () => {
    const plan = queryPlanSchema.parse({
      dataSourceId: '22222222-2222-2222-2222-222222222222',
      metrics: [
        {
          metricId: '11111111-1111-1111-1111-111111111111',
          aggregation: 'sum',
          alias: 'revenue',
        },
      ],
      dimensions: [{ field: 'public.orders.status', alias: 'status' }],
      filters: [{ field: 'public.orders.status', operator: 'eq', value: 'paid' }],
      sort: [{ field: 'revenue', direction: 'DESC' }],
      limit: 50,
    });

    const compiled = buildCompiledQuery(plan, ctx);
    expect(compiled.sql).toContain('SELECT');
    expect(compiled.sql).toContain('SUM(');
    expect(compiled.sql).toContain('GROUP BY');
    expect(compiled.sql).toContain('$1');
    expect(compiled.params).toEqual(['paid', 50]);
    expect(() => assertSafeSelectSql(compiled.sql)).not.toThrow();
  });

  it('rejects multi-table plans', () => {
    const plan = queryPlanSchema.parse({
      dataSourceId: '22222222-2222-2222-2222-222222222222',
      metrics: [
        {
          expression: 'public.orders.amount',
          aggregation: 'sum',
          alias: 'revenue',
        },
      ],
      dimensions: [{ field: 'public.customers.name', alias: 'customer' }],
      limit: 10,
    });

    const multiCtx = {
      ...ctx,
      tables: [
        ...ctx.tables,
        { schema: 'public', name: 'customers', columns: [{ name: 'name' }] },
      ],
    };

    expect(() => buildCompiledQuery(plan, multiCtx)).toThrow(/Multi-table/);
  });
});

describe('assertSafeSelectSql', () => {
  it('blocks mutations', () => {
    expect(() => assertSafeSelectSql('DELETE FROM orders')).toThrow();
    expect(() => assertSafeSelectSql('SELECT 1; DROP TABLE x')).toThrow();
  });
});
