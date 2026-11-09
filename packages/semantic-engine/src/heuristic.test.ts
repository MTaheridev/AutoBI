import { describe, expect, it } from 'vitest';
import { proposeFromSchemaHeuristic } from './heuristic.js';
import { preferApproved, canTransition } from './approval.js';

describe('proposeFromSchemaHeuristic', () => {
  it('proposes entities metrics dimensions and relationships', () => {
    const proposal = proposeFromSchemaHeuristic({
      schemas: ['public'],
      tables: [
        {
          schema: 'public',
          name: 'orders',
          type: 'table',
          columns: [
            { name: 'id', dataType: 'integer', isPrimaryKey: true },
            { name: 'customer_id', dataType: 'integer', isForeignKey: true },
            { name: 'amount', dataType: 'number' },
            { name: 'status', dataType: 'string' },
            { name: 'created_at', dataType: 'datetime' },
          ],
        },
        {
          schema: 'public',
          name: 'customers',
          type: 'table',
          columns: [
            { name: 'id', dataType: 'integer', isPrimaryKey: true },
            { name: 'name', dataType: 'string' },
            { name: 'region', dataType: 'string' },
          ],
        },
      ],
      relationships: [
        {
          sourceSchema: 'public',
          sourceTable: 'orders',
          sourceColumn: 'customer_id',
          targetSchema: 'public',
          targetTable: 'customers',
          targetColumn: 'id',
        },
      ],
    });

    expect(proposal.entities.map((e) => e.name)).toEqual(
      expect.arrayContaining(['Order', 'Customer']),
    );
    expect(proposal.metrics.some((m) => m.expression.includes('amount'))).toBe(true);
    expect(proposal.dimensions.some((d) => d.field.includes('status'))).toBe(true);
    expect(proposal.relationships).toHaveLength(1);
  });
});

describe('approval helpers', () => {
  it('prefers approved definitions', () => {
    const items = [
      { status: 'Proposed' as const, id: 1 },
      { status: 'Approved' as const, id: 2 },
      { status: 'Rejected' as const, id: 3 },
    ];
    expect(preferApproved(items).map((i) => i.id)).toEqual([2]);
  });

  it('allows approve and reject transitions', () => {
    expect(canTransition('Proposed', 'Approved')).toBe(true);
    expect(canTransition('Proposed', 'Rejected')).toBe(true);
    expect(canTransition('Rejected', 'Proposed')).toBe(true);
  });
});
