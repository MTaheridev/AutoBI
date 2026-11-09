import { describe, expect, it } from 'vitest';
import { dashboardSpecSchema, dashboardProposalSchema } from './spec.js';
import { proposeDashboardHeuristic } from './heuristic.js';

describe('dashboardSpecSchema', () => {
  it('validates a dashboard with widgets', () => {
    const result = dashboardSpecSchema.safeParse({
      version: 1,
      title: 'Sales',
      layout: { columns: 12, rowHeight: 80 },
      widgets: [
        {
          id: 'w1',
          type: 'kpi',
          title: 'Revenue',
          queryId: '11111111-1111-1111-1111-111111111111',
          position: { x: 0, y: 0, width: 3, height: 2 },
          config: {},
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown widget types', () => {
    const result = dashboardSpecSchema.safeParse({
      version: 1,
      title: 'Bad',
      widgets: [
        {
          id: 'w1',
          type: 'iframe',
          title: 'Hack',
          queryId: '11111111-1111-1111-1111-111111111111',
          position: { x: 0, y: 0, width: 3, height: 2 },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('proposeDashboardHeuristic', () => {
  it('proposes widgets from schema', () => {
    const proposal = proposeDashboardHeuristic(
      {
        tables: [
          {
            schema: 'public',
            name: 'orders',
            columns: [
              { name: 'id', dataType: 'integer', isPrimaryKey: true },
              { name: 'amount', dataType: 'number' },
              { name: 'status', dataType: 'string' },
            ],
          },
        ],
      },
      'Sales overview',
    );
    expect(proposal.widgets.length).toBeGreaterThan(1);
    const parsed = dashboardProposalSchema.safeParse(proposal);
    expect(parsed.success).toBe(true);
  });
});
