'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

export interface WidgetResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface WidgetProps {
  title: string;
  config: Record<string, unknown>;
  result: WidgetResult | null;
  loading?: boolean;
  error?: string | null;
}

const KpiWidget = dynamic(() => import('./kpi-widget').then((m) => m.KpiWidget), { ssr: false });
const LineChartWidget = dynamic(() => import('./chart-widgets').then((m) => m.LineChartWidget), {
  ssr: false,
});
const BarChartWidget = dynamic(() => import('./chart-widgets').then((m) => m.BarChartWidget), {
  ssr: false,
});
const AreaChartWidget = dynamic(() => import('./chart-widgets').then((m) => m.AreaChartWidget), {
  ssr: false,
});
const PieChartWidget = dynamic(() => import('./chart-widgets').then((m) => m.PieChartWidget), {
  ssr: false,
});
const DonutChartWidget = dynamic(() => import('./chart-widgets').then((m) => m.DonutChartWidget), {
  ssr: false,
});
const TableWidget = dynamic(() => import('./table-widget').then((m) => m.TableWidget), {
  ssr: false,
});

export const widgetRegistry: Record<string, ComponentType<WidgetProps>> = {
  kpi: KpiWidget,
  line: LineChartWidget,
  bar: BarChartWidget,
  area: AreaChartWidget,
  pie: PieChartWidget,
  donut: DonutChartWidget,
  table: TableWidget,
};
