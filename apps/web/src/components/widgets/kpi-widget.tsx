'use client';

import type { WidgetProps } from './registry';

export function KpiWidget({ title, result, loading, error }: WidgetProps) {
  const value =
    result?.rows?.[0] && result.columns[0] != null
      ? String(result.rows[0][result.columns.find((c) => c !== 'dimension') ?? result.columns[0]] ?? '—')
      : '—';

  return (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="text-sm text-ink-muted">{title}</div>
      {loading ? (
        <div className="text-sm text-ink-muted">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div className="font-display text-3xl font-semibold tracking-tight">{value}</div>
      )}
    </div>
  );
}
