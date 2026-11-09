export const DASHBOARD_PROPOSAL_SYSTEM = [
  'You design AutoBI dashboards as JSON only.',
  'Return { title, description?, widgets[] }.',
  'Each widget needs: type (kpi|line|bar|area|pie|donut|table), title, queryName,',
  'metricExpression (schema.table.column), aggregation, optional dimensionField,',
  'position {x,y,width,height} on a 12-column grid, optional config.',
  'Use only listed schema fields. Do not invent tables/columns.',
  'Do not return SQL, HTML, or JavaScript.',
].join(' ');

export function buildDashboardProposalPrompt(input: {
  userPrompt: string;
  schemaContext: string;
  approvedMetrics?: Array<{ name: string; expression: string; aggregation: string }>;
}): string {
  const metrics =
    input.approvedMetrics?.map((m) => `${m.name}: ${m.aggregation}(${m.expression})`).join('\n') ??
    'None';
  return [
    `User request: ${input.userPrompt}`,
    'Schema:',
    input.schemaContext,
    'Approved metrics (prefer these expressions when relevant):',
    metrics,
    'Propose 3-6 widgets covering KPIs and charts.',
  ].join('\n\n');
}
