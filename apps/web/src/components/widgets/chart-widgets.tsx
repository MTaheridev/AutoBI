'use client';

import ReactECharts from 'echarts-for-react';
import type { WidgetProps } from './registry';

function useSeries(result: WidgetProps['result']) {
  const categories = (result?.rows ?? []).map((r) => String(r.dimension ?? r[result!.columns[0]] ?? ''));
  const values = (result?.rows ?? []).map((r) => Number(r.value ?? r[result!.columns[1]] ?? 0));
  return { categories, values };
}

function ChartShell({
  title,
  loading,
  error,
  option,
}: {
  title: string;
  loading?: boolean;
  error?: string | null;
  option: Record<string, unknown>;
}) {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-1 px-1 text-sm font-medium">{title}</div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">Loading…</div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center text-sm text-red-600">{error}</div>
      ) : (
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
      )}
    </div>
  );
}

export function LineChartWidget({ title, result, loading, error }: WidgetProps) {
  const { categories, values } = useSeries(result);
  return (
    <ChartShell
      title={title}
      loading={loading}
      error={error}
      option={{
        grid: { left: 40, right: 16, top: 24, bottom: 28 },
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: values, smooth: true }],
        tooltip: { trigger: 'axis' },
      }}
    />
  );
}

export function BarChartWidget({ title, result, loading, error }: WidgetProps) {
  const { categories, values } = useSeries(result);
  return (
    <ChartShell
      title={title}
      loading={loading}
      error={error}
      option={{
        grid: { left: 40, right: 16, top: 24, bottom: 28 },
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: values }],
        tooltip: { trigger: 'axis' },
      }}
    />
  );
}

export function AreaChartWidget({ title, result, loading, error }: WidgetProps) {
  const { categories, values } = useSeries(result);
  return (
    <ChartShell
      title={title}
      loading={loading}
      error={error}
      option={{
        grid: { left: 40, right: 16, top: 24, bottom: 28 },
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: values, areaStyle: {}, smooth: true }],
        tooltip: { trigger: 'axis' },
      }}
    />
  );
}

export function PieChartWidget({ title, result, loading, error }: WidgetProps) {
  const data = (result?.rows ?? []).map((r) => ({
    name: String(r.dimension ?? ''),
    value: Number(r.value ?? 0),
  }));
  return (
    <ChartShell
      title={title}
      loading={loading}
      error={error}
      option={{
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: '65%', data }],
      }}
    />
  );
}

export function DonutChartWidget({ title, result, loading, error }: WidgetProps) {
  const data = (result?.rows ?? []).map((r) => ({
    name: String(r.dimension ?? ''),
    value: Number(r.value ?? 0),
  }));
  return (
    <ChartShell
      title={title}
      loading={loading}
      error={error}
      option={{
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: ['40%', '65%'], data }],
      }}
    />
  );
}
