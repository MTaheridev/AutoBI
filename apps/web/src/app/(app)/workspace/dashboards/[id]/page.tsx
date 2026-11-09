'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import { api, ApiError } from '@/lib/api';
import { Badge, Button } from '@/components/ui';
import { widgetRegistry, type WidgetResult } from '@/components/widgets/registry';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface DashboardDto {
  id: string;
  name: string;
  description: string | null;
  currentVersion: number;
}

interface WidgetSpec {
  id: string;
  type: string;
  title: string;
  queryId: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, unknown>;
}

interface DashboardSpec {
  version: number;
  title: string;
  description?: string;
  layout: { columns: number; rowHeight: number };
  widgets: WidgetSpec[];
}

export default function DashboardDetailPage() {
  const params = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [spec, setSpec] = useState<DashboardSpec | null>(null);
  const [results, setResults] = useState<Record<string, WidgetResult | null>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(1000);

  const load = useCallback(async () => {
    const data = await api<{ dashboard: DashboardDto; spec: DashboardSpec | null }>(
      `/dashboards/${params.id}`,
    );
    setDashboard(data.dashboard);
    setSpec(data.spec);
  }, [params.id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    const onResize = () => setWidth(Math.max(640, window.innerWidth - 320));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const runWidgets = useCallback(async (widgets: WidgetSpec[]) => {
    for (const widget of widgets) {
      setLoadingMap((m) => ({ ...m, [widget.id]: true }));
      setErrors((m) => ({ ...m, [widget.id]: null }));
      try {
        const data = await api<{ result: WidgetResult }>(`/queries/${widget.queryId}/execute`, {
          method: 'POST',
        });
        setResults((m) => ({ ...m, [widget.id]: data.result }));
      } catch (err) {
        setErrors((m) => ({
          ...m,
          [widget.id]: err instanceof ApiError ? err.message : 'Failed',
        }));
      } finally {
        setLoadingMap((m) => ({ ...m, [widget.id]: false }));
      }
    }
  }, []);

  useEffect(() => {
    if (spec?.widgets?.length) {
      runWidgets(spec.widgets).catch(() => undefined);
    }
  }, [spec, runWidgets]);

  const layout: Layout[] = useMemo(
    () =>
      (spec?.widgets ?? []).map((w) => ({
        i: w.id,
        x: w.position.x,
        y: w.position.y,
        w: w.position.width,
        h: w.position.height,
        minW: 2,
        minH: 2,
      })),
    [spec],
  );

  async function saveLayout(next: Layout[]) {
    if (!spec || !dashboard) return;
    setBusy(true);
    setError(null);
    try {
      const widgets = spec.widgets.map((widget) => {
        const item = next.find((l) => l.i === widget.id);
        if (!item) return widget;
        return {
          ...widget,
          position: {
            x: item.x,
            y: item.y,
            width: item.w,
            height: item.h,
          },
        };
      });
      const updated = await api<{ dashboard: DashboardDto; spec: DashboardSpec }>(
        `/dashboards/${dashboard.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            spec: { ...spec, widgets },
          }),
        },
      );
      setDashboard(updated.dashboard);
      setSpec(updated.spec);
      setMessage(`Saved version ${updated.dashboard.currentVersion}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  if (!dashboard || !spec) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{dashboard.name}</h1>
          <div className="mt-2 flex gap-2">
            <Badge>v{dashboard.currentVersion}</Badge>
            <Badge>{spec.widgets.length} widgets</Badge>
          </div>
          {dashboard.description && (
            <p className="mt-2 text-sm text-ink-muted">{dashboard.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => runWidgets(spec.widgets)}
          >
            Refresh data
          </Button>
        </div>
      </div>

      {message && <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <GridLayout
        className="layout"
        layout={layout}
        cols={spec.layout.columns || 12}
        rowHeight={spec.layout.rowHeight || 80}
        width={width}
        onDragStop={saveLayout}
        onResizeStop={saveLayout}
        draggableHandle=".drag-handle"
      >
        {spec.widgets.map((widget) => {
          const Component = widgetRegistry[widget.type];
          return (
            <div key={widget.id} className="panel overflow-hidden">
              <div className="drag-handle cursor-move border-b border-line px-3 py-1 text-[10px] uppercase tracking-wide text-ink-muted">
                drag
              </div>
              {Component ? (
                <div className="h-[calc(100%-28px)]">
                  <Component
                    title={widget.title}
                    config={widget.config ?? {}}
                    result={results[widget.id] ?? null}
                    loading={loadingMap[widget.id]}
                    error={errors[widget.id]}
                  />
                </div>
              ) : (
                <div className="p-4 text-sm text-red-600">Unknown widget type: {widget.type}</div>
              )}
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
