'use client';

import type { WidgetProps } from './registry';

export function TableWidget({ title, result, loading, error }: WidgetProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-2 text-sm font-medium">{title}</div>
      <div className="min-h-0 flex-1 overflow-auto">
        {loading && <div className="p-4 text-sm text-ink-muted">Loading…</div>}
        {error && <div className="p-4 text-sm text-red-600">{error}</div>}
        {result && (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-muted/90 text-ink-muted">
              <tr>
                {result.columns.map((c) => (
                  <th key={c} className="px-3 py-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="border-t border-line">
                  {result.columns.map((c) => (
                    <td key={c} className="px-3 py-1.5">
                      {String(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
