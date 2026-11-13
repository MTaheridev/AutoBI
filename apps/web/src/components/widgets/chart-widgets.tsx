'use client';

import ReactECharts from 'echarts-for-react';
import { formatCellValue, formatNumber } from '@/lib/format-display';
import type { WidgetProps } from './registry';
import { cartesianAxes, chartBaseOption, readChartTokens } from './chart-theme';

function useSeries(result: WidgetProps['result'], timeZone?: string) {
  const categories = (result?.rows ?? []).map((r) =>
    formatCellValue(r.dimension ?? r[result!.columns[0]], { timeZone }),
  );
  const values = (result?.rows ?? []).map((r) =>
    Number(r.value ?? r[result!.columns[1]] ?? 0),
  );
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
    <div className="flex h-full min-w-0 flex-col overflow-hidden p-3">
      <div className="mb-1 truncate px-1 text-sm font-medium text-ink">{title}</div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center data-mono text-sm text-ink-muted">
          Loading…
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center text-sm text-red-600">{error}</div>
      ) : (
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%', minWidth: 0 }}
          opts={{ renderer: 'canvas' }}
          notMerge
        />
      )}
    </div>
  );
}

function seriesColor() {
  return readChartTokens().signal;
}

export function LineChartWidget({ title, result, loading, error, timeZone }: WidgetProps) {
  const { categories, values } = useSeries(result, timeZone);
  return (
    <ChartShell
      title={title}
      loading={loading}
      error={error}
      option={{
        ...chartBaseOption(),
        grid: { left: 48, right: 16, top: 24, bottom: 36, containLabel: true },
        ...cartesianAxes(categories),
        series: [
          {
            type: 'line',
            data: values,
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2, color: seriesColor() },
            itemStyle: { color: seriesColor() },
          },
        ],
        tooltip: {
          ...(chartBaseOption().tooltip as object),
          trigger: 'axis',
          valueFormatter: (v: unknown) =>
            typeof v === 'number' ? formatNumber(v) : String(v ?? ''),
        },
      }}
    />
  );
}

export function BarChartWidget({ title, result, loading, error, timeZone }: WidgetProps) {
  const { categories, values } = useSeries(result, timeZone);
  return (
    <ChartShell
      title={title}
      loading={loading}
      error={error}
      option={{
        ...chartBaseOption(),
        grid: { left: 48, right: 16, top: 24, bottom: 36, containLabel: true },
        ...cartesianAxes(categories),
        series: [
          {
            type: 'bar',
            data: values,
            itemStyle: { color: seriesColor(), borderRadius: [4, 4, 0, 0] },
            barMaxWidth: 36,
          },
        ],
        tooltip: {
          ...(chartBaseOption().tooltip as object),
          trigger: 'axis',
          valueFormatter: (v: unknown) =>
            typeof v === 'number' ? formatNumber(v) : String(v ?? ''),
        },
      }}
    />
  );
}

export function AreaChartWidget({ title, result, loading, error, timeZone }: WidgetProps) {
  const { categories, values } = useSeries(result, timeZone);
  const signal = seriesColor();
  return (
    <ChartShell
      title={title}
      loading={loading}
      error={error}
      option={{
        ...chartBaseOption(),
        grid: { left: 48, right: 16, top: 24, bottom: 36, containLabel: true },
        ...cartesianAxes(categories),
        series: [
          {
            type: 'line',
            data: values,
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2, color: signal },
            itemStyle: { color: signal },
            areaStyle: { color: signal, opacity: 0.18 },
          },
        ],
        tooltip: {
          ...(chartBaseOption().tooltip as object),
          trigger: 'axis',
          valueFormatter: (v: unknown) =>
            typeof v === 'number' ? formatNumber(v) : String(v ?? ''),
        },
      }}
    />
  );
}

export function PieChartWidget({ title, result, loading, error, timeZone }: WidgetProps) {
  const data = (result?.rows ?? []).map((r) => ({
    name: formatCellValue(r.dimension ?? '', { timeZone }),
    value: Number(r.value ?? 0),
  }));
  return (
    <ChartShell
      title={title}
      loading={loading}
      error={error}
      option={{
        ...chartBaseOption(),
        tooltip: {
          ...(chartBaseOption().tooltip as object),
          trigger: 'item',
          valueFormatter: (v: unknown) =>
            typeof v === 'number' ? formatNumber(v) : String(v ?? ''),
        },
        series: [{ type: 'pie', radius: '65%', data }],
      }}
    />
  );
}

export function DonutChartWidget({ title, result, loading, error, timeZone }: WidgetProps) {
  const data = (result?.rows ?? []).map((r) => ({
    name: formatCellValue(r.dimension ?? '', { timeZone }),
    value: Number(r.value ?? 0),
  }));
  return (
    <ChartShell
      title={title}
      loading={loading}
      error={error}
      option={{
        ...chartBaseOption(),
        tooltip: {
          ...(chartBaseOption().tooltip as object),
          trigger: 'item',
          valueFormatter: (v: unknown) =>
            typeof v === 'number' ? formatNumber(v) : String(v ?? ''),
        },
        series: [{ type: 'pie', radius: ['40%', '65%'], data }],
      }}
    />
  );
}
