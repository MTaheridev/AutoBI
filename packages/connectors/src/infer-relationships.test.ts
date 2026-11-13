import { describe, expect, it } from 'vitest';
import { inferRelationshipsFromColumns } from './infer-relationships.js';
import type { DatabaseTable } from './types.js';

const tables: DatabaseTable[] = [
  {
    schema: 'rahbaria_employee_credit_system',
    name: 'stores',
    type: 'table',
    columns: [
      { name: 'id', dataType: 'integer', nativeDataType: 'int', nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: 'name', dataType: 'string', nativeDataType: 'varchar', nullable: false, isPrimaryKey: false, isForeignKey: false },
    ],
  },
  {
    schema: 'rahbaria_employee_credit_system',
    name: 'wallets',
    type: 'table',
    columns: [
      { name: 'id', dataType: 'integer', nativeDataType: 'int', nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: 'label', dataType: 'string', nativeDataType: 'varchar', nullable: false, isPrimaryKey: false, isForeignKey: false },
    ],
  },
  {
    schema: 'rahbaria_employee_credit_system',
    name: 'purchases',
    type: 'table',
    columns: [
      { name: 'id', dataType: 'integer', nativeDataType: 'int', nullable: false, isPrimaryKey: true, isForeignKey: false },
      { name: 'store_id', dataType: 'integer', nativeDataType: 'int', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'wallet_id', dataType: 'integer', nativeDataType: 'int', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'amount', dataType: 'number', nativeDataType: 'decimal', nullable: false, isPrimaryKey: false, isForeignKey: false },
    ],
  },
];

describe('inferRelationshipsFromColumns', () => {
  it('infers store_id and wallet_id relationships', () => {
    const inferred = inferRelationshipsFromColumns(tables);
    expect(inferred).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceTable: 'purchases',
          sourceColumn: 'store_id',
          targetTable: 'stores',
          targetColumn: 'id',
          source: 'inferred',
        }),
        expect.objectContaining({
          sourceTable: 'purchases',
          sourceColumn: 'wallet_id',
          targetTable: 'wallets',
          targetColumn: 'id',
          source: 'inferred',
        }),
      ]),
    );
  });

  it('skips duplicates of existing FK rows', () => {
    const existing = [
      {
        sourceSchema: 'rahbaria_employee_credit_system',
        sourceTable: 'purchases',
        sourceColumn: 'store_id',
        targetSchema: 'rahbaria_employee_credit_system',
        targetTable: 'stores',
        targetColumn: 'id',
        confidence: 1,
        source: 'database' as const,
      },
    ];
    const inferred = inferRelationshipsFromColumns(tables, existing);
    expect(inferred.find((r) => r.sourceColumn === 'store_id')).toBeUndefined();
    expect(inferred.find((r) => r.sourceColumn === 'wallet_id')).toBeTruthy();
  });

  it('infers *_uid relationships to peer uid columns', () => {
    const uidTables: DatabaseTable[] = [
      {
        schema: 'rahbaria_employee_credit_system',
        name: 'stores',
        type: 'table',
        columns: [
          { name: 'uid', dataType: 'string', nativeDataType: 'varchar', nullable: false, isPrimaryKey: true, isForeignKey: false },
          { name: 'title', dataType: 'string', nativeDataType: 'varchar', nullable: false, isPrimaryKey: false, isForeignKey: false },
        ],
      },
      {
        schema: 'rahbaria_employee_credit_system',
        name: 'purchases',
        type: 'table',
        columns: [
          { name: 'uid', dataType: 'string', nativeDataType: 'varchar', nullable: false, isPrimaryKey: true, isForeignKey: false },
          { name: 'store_uid', dataType: 'string', nativeDataType: 'varchar', nullable: false, isPrimaryKey: false, isForeignKey: false },
        ],
      },
    ];
    const inferred = inferRelationshipsFromColumns(uidTables);
    expect(inferred).toEqual([
      expect.objectContaining({
        sourceTable: 'purchases',
        sourceColumn: 'store_uid',
        targetTable: 'stores',
        targetColumn: 'uid',
      }),
    ]);
  });
});
