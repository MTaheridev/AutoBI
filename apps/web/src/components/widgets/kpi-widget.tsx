'use client';

import { formatCellValue } from '@/lib/format-display';
import type { WidgetProps } from './registry';

export function KpiWidget({ title, result, loading, error, timeZone }: WidgetProps) {
  const valueCol =
    result?.columns.find((c) => c !== 'dimension') ?? result?.columns[0];
  const raw =
    result?.rows?.[0] && valueCol != null ? result.rows[0][valueCol] : undefined;
  const value = raw == null ? '—' : formatCellValue(raw, { timeZone });

  return (
    <div className="flex h-full min-w-0 flex-col justify-between overflow-hidden p-4">
      <div className="truncate text-sm text-ink-muted">{title}</div>
      {loading ? (
        <div className="text-sm text-ink-muted">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div className="truncate font-display text-3xl font-semibold tracking-tight">
          {value}
        </div>
      )}
    </div>
  );
}
