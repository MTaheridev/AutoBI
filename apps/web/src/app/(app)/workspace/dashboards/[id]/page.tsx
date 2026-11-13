'use client';

import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import { api, ApiError } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { useAppMode } from '@/lib/app-mode';
import { cn } from '@/lib/utils';
import { AgentSurfaceShell } from '@/components/agent/agent-surface-shell';
import { Badge, Button, Input } from '@/components/ui';
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
  const { current } = useWorkspace();
  const { mode, ready } = useAppMode();
  const agent = mode === 'agent';
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [spec, setSpec] = useState<DashboardSpec | null>(null);
  const [results, setResults] = useState<Record<string, WidgetResult | null>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(0);
  const [editPrompt, setEditPrompt] = useState('');
  const gridHostRef = useRef<HTMLDivElement>(null);
  const timeZone = current?.timezone || 'UTC';

  const load = useCallback(async () => {
    const data = await api<{ dashboard: DashboardDto; spec: DashboardSpec | null }>(
      `/dashboards/${params.id}`,
    );
    setDashboard(data.dashboard);
    setSpec(data.spec);
  }, [params.id]);

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load dashboard'),
    );
  }, [load]);

  useEffect(() => {
    const el = gridHostRef.current;
    if (!el) return;
    const measure = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dashboard?.id, spec?.widgets.length]);

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

  if (!ready) {
    return <p className={cn('text-sm', agent ? 'text-[#8b95a8]' : 'text-ink-muted')}>Loading…</p>;
  }

  if (error && !dashboard) {
    const err = (
      <p className={cn('text-sm', agent ? 'text-red-400' : 'text-red-600')} role="alert">
        {error}
      </p>
    );
    return agent ? <AgentSurfaceShell>{err}</AgentSurfaceShell> : err;
  }

  if (!dashboard || !spec) {
    const loading = (
      <p className={cn('text-sm', agent ? 'text-[#8b95a8]' : 'text-ink-muted')}>Loading…</p>
    );
    return agent ? <AgentSurfaceShell>{loading}</AgentSurfaceShell> : loading;
  }

  const body = (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className={cn(
              'font-display text-2xl font-semibold tracking-tight',
              agent && 'text-[#e8edf4]',
            )}
          >
            {dashboard.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>v{dashboard.currentVersion}</Badge>
            <Badge>{spec.widgets.length} widgets</Badge>
            <Badge tone="neutral">{timeZone}</Badge>
          </div>
          {dashboard.description && (
            <p className={cn('mt-2 text-sm', agent ? 'text-[#8b95a8]' : 'text-ink-muted')}>
              {dashboard.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => runWidgets(spec.widgets)}
            className={
              agent
                ? 'border-white/10 bg-white/[0.04] text-[#e8edf4] hover:bg-white/[0.08]'
                : undefined
            }
          >
            Refresh data
          </Button>
        </div>
      </div>

      {message && (
        <p
          className={cn(
            'text-sm',
            agent ? 'text-[#1FD1A0]' : 'text-emerald-700 dark:text-emerald-300',
          )}
          role="status"
        >
          {message}
        </p>
      )}
      {error && (
        <p className={cn('text-sm', agent ? 'text-red-400' : 'text-red-600')} role="alert">
          {error}
        </p>
      )}

      <form
        className={cn(
          'flex flex-col gap-3 p-4 md:flex-row md:items-end',
          agent
            ? 'rounded-panel border border-white/[0.08] bg-white/[0.03]'
            : 'panel',
        )}
        onSubmit={async (e: FormEvent) => {
          e.preventDefault();
          if (!current || !editPrompt.trim()) return;
          setBusy(true);
          setError(null);
          setMessage(null);
          try {
            const data = await api<{
              dashboard: DashboardDto;
              spec: DashboardSpec;
              proposalMeta: { addedWidgets: number };
            }>('/ai/edit-dashboard', {
              method: 'POST',
              body: JSON.stringify({
                workspaceId: current.id,
                dashboardId: dashboard.id,
                prompt: editPrompt,
              }),
            });
            setDashboard(data.dashboard);
            setSpec(data.spec);
            setEditPrompt('');
            setMessage(
              `Added ${data.proposalMeta.addedWidgets} widget(s) as v${data.dashboard.currentVersion}`,
            );
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Edit failed');
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="flex-1 space-y-1">
          <label
            htmlFor="nl-edit"
            className={cn('text-sm font-medium', agent && 'text-[#c5cedc]')}
          >
            Edit with natural language
          </label>
          <Input
            id="nl-edit"
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Add a chart of revenue by region…"
            className={
              agent
                ? 'border-white/10 bg-black/30 text-[#e8edf4] placeholder:text-[#6f7a8d]'
                : undefined
            }
          />
        </div>
        <Button type="submit" disabled={busy || !editPrompt.trim()}>
          {busy ? 'Updating…' : 'Apply edit'}
        </Button>
      </form>

      <div ref={gridHostRef} className="dashboard-grid-host w-full min-w-0">
        {width > 0 ? (
          <GridLayout
            className="layout"
            layout={layout}
            cols={spec.layout.columns || 12}
            rowHeight={spec.layout.rowHeight || 80}
            width={width}
            margin={[12, 12]}
            containerPadding={[0, 0]}
            onDragStop={saveLayout}
            onResizeStop={saveLayout}
            draggableHandle=".drag-handle"
          >
            {spec.widgets.map((widget) => {
              const Component = widgetRegistry[widget.type];
              return (
                <div
                  key={widget.id}
                  className={cn(
                    'overflow-hidden rounded-panel border',
                    agent
                      ? 'border-white/[0.08] bg-[#0f1520]/90'
                      : 'panel border-line bg-surface-elevated',
                  )}
                >
                  <div
                    className={cn(
                      'drag-handle cursor-move border-b px-3 py-1 text-[10px] uppercase tracking-wide',
                      agent
                        ? 'border-white/[0.06] text-[#6f7a8d]'
                        : 'border-line text-ink-muted',
                    )}
                  >
                    drag
                  </div>
                  {Component ? (
                    <div className="h-[calc(100%-28px)] min-w-0">
                      <Component
                        title={widget.title}
                        config={widget.config ?? {}}
                        result={results[widget.id] ?? null}
                        loading={loadingMap[widget.id]}
                        error={errors[widget.id]}
                        timeZone={timeZone}
                      />
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-red-500">
                      Unknown widget type: {widget.type}
                    </div>
                  )}
                </div>
              );
            })}
          </GridLayout>
        ) : (
          <p className={cn('text-sm', agent ? 'text-[#8b95a8]' : 'text-ink-muted')}>
            Measuring layout…
          </p>
        )}
      </div>
    </div>
  );

  if (agent) {
    return <AgentSurfaceShell>{body}</AgentSurfaceShell>;
  }

  return body;
}
