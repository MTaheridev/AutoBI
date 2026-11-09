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

export const createDashboardSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  spec: dashboardSpecSchema.optional(),
});

export const updateDashboardSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  spec: dashboardSpecSchema.optional(),
});

export const generateDashboardSchema = z.object({
  workspaceId: z.string().uuid(),
  dataSourceId: z.string().uuid(),
  semanticModelId: z.string().uuid().optional(),
  prompt: z.string().min(1).max(2000),
  useAi: z.boolean().optional().default(true),
  provider: z.enum(['openai', 'openrouter']).optional(),
});

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;
export type GenerateDashboardInput = z.infer<typeof generateDashboardSchema>;
export type DashboardSpecInput = z.infer<typeof dashboardSpecSchema>;
