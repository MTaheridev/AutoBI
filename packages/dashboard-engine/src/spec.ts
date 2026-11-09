import { z } from 'zod';

export const widgetTypes = [
  'kpi',
  'line',
  'bar',
  'area',
  'pie',
  'donut',
  'table',
] as const;

export type WidgetType = (typeof widgetTypes)[number];

export const dashboardWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(widgetTypes),
  title: z.string().min(1).max(120),
  queryId: z.string().uuid(),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    width: z.number().int().min(1).max(12),
    height: z.number().int().min(1).max(12),
  }),
  config: z.record(z.unknown()).default({}),
});

export const dashboardSpecSchema = z.object({
  version: z.number().int().positive().default(1),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  layout: z
    .object({
      columns: z.number().int().positive().default(12),
      rowHeight: z.number().int().positive().default(80),
    })
    .default({ columns: 12, rowHeight: 80 }),
  widgets: z.array(dashboardWidgetSchema).default([]),
});

export type DashboardWidget = z.infer<typeof dashboardWidgetSchema>;
export type DashboardSpec = z.infer<typeof dashboardSpecSchema>;

/** AI/heuristic proposal before query IDs exist */
export const proposedWidgetSchema = z.object({
  type: z.enum(widgetTypes),
  title: z.string().min(1).max(120),
  queryName: z.string().min(1).max(120),
  metricExpression: z.string().min(1),
  aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max', 'count_distinct']),
  dimensionField: z.string().optional(),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    width: z.number().int().min(1).max(12),
    height: z.number().int().min(1).max(12),
  }),
  config: z.record(z.unknown()).default({}),
});

export const dashboardProposalSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  widgets: z.array(proposedWidgetSchema).max(12).default([]),
});

export type DashboardProposal = z.infer<typeof dashboardProposalSchema>;
export type ProposedWidget = z.infer<typeof proposedWidgetSchema>;
