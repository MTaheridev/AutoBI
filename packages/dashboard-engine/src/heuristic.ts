import type { DashboardProposal } from './spec.js';

export interface SchemaHint {
  tables: Array<{
    schema: string;
    name: string;
    columns: Array<{ name: string; dataType: string; isPrimaryKey?: boolean; isForeignKey?: boolean }>;
  }>;
}

function isNumeric(t: string) {
  return t === 'integer' || t === 'number';
}

function isDim(t: string, name: string) {
  if (t === 'string' || t === 'boolean' || t === 'date' || t === 'datetime') return true;
  return /status|type|category|region|name/.test(name.toLowerCase());
}

/** Build a simple dashboard proposal from schema metadata (no AI). */
export function proposeDashboardHeuristic(
  snapshot: SchemaHint,
  prompt = 'Overview dashboard',
): DashboardProposal {
  const table =
    snapshot.tables.find((t) =>
      t.columns.some((c) => isNumeric(c.dataType) && !c.isPrimaryKey && !c.isForeignKey),
    ) ?? snapshot.tables[0];

  if (!table) {
    return {
      title: 'Empty dashboard',
      description: 'No tables available for proposals',
      widgets: [],
    };
  }

  const numeric = table.columns.filter(
    (c) => isNumeric(c.dataType) && !c.isPrimaryKey && !c.isForeignKey,
  );
  const dims = table.columns.filter((c) => isDim(c.dataType, c.name) && !c.isPrimaryKey);
  const metricCol = numeric[0] ?? table.columns.find((c) => c.isPrimaryKey) ?? table.columns[0]!;
  const dimCol = dims[0];
  const base = `${table.schema}.${table.name}`;

  const widgets: DashboardProposal['widgets'] = [
    {
      type: 'kpi',
      title: `${metricCol.name} total`,
      queryName: `${table.name}_${metricCol.name}_kpi`,
      metricExpression: `${base}.${metricCol.name}`,
      aggregation: numeric.length ? 'sum' : 'count',
      position: { x: 0, y: 0, width: 3, height: 2 },
      config: {},
    },
  ];

  if (dimCol) {
    widgets.push({
      type: 'bar',
      title: `${metricCol.name} by ${dimCol.name}`,
      queryName: `${table.name}_${metricCol.name}_by_${dimCol.name}`,
      metricExpression: `${base}.${metricCol.name}`,
      aggregation: numeric.length ? 'sum' : 'count',
      dimensionField: `${base}.${dimCol.name}`,
      position: { x: 3, y: 0, width: 5, height: 4 },
      config: { xField: 'dimension', yField: 'value' },
    });
    widgets.push({
      type: 'pie',
      title: `Share by ${dimCol.name}`,
      queryName: `${table.name}_share_${dimCol.name}`,
      metricExpression: `${base}.${metricCol.name}`,
      aggregation: numeric.length ? 'sum' : 'count',
      dimensionField: `${base}.${dimCol.name}`,
      position: { x: 8, y: 0, width: 4, height: 4 },
      config: { nameField: 'dimension', valueField: 'value' },
    });
  }

  widgets.push({
    type: 'table',
    title: `${table.name} breakdown`,
    queryName: `${table.name}_table`,
    metricExpression: `${base}.${metricCol.name}`,
    aggregation: numeric.length ? 'sum' : 'count',
    dimensionField: dimCol ? `${base}.${dimCol.name}` : undefined,
    position: { x: 0, y: 4, width: 12, height: 4 },
    config: {},
  });

  return {
    title: prompt.slice(0, 80) || `${table.name} overview`,
    description: `Auto-generated from ${base}`,
    widgets,
  };
}
