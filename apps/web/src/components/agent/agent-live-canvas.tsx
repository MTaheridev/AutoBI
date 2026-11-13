'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { api, formatApiError } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Button, Badge, InlineError } from '@/components/ui';
import { widgetRegistry, type WidgetResult } from '@/components/widgets/registry';

type WidgetSpec = {
  id: string;
  type: string;
  title: string;
  queryId: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, unknown>;
};

type DashboardSpec = {
  title: string;
  description?: string;
  widgets: WidgetSpec[];
};

export function AgentLiveCanvas({
  dashboardId,
  onClose,
}: {
  dashboardId: string;
  onClose?: () => void;
}) {
  const [name, setName] = useState('Dashboard');
  const [spec, setSpec] = useState<DashboardSpec | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [results, setResults] = useState<Record<string, WidgetResult | null>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { current } = useWorkspace();
  const timeZone = current?.timezone || 'UTC';

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{
        dashboard: { name: string; currentVersion: number };
        spec: DashboardSpec | null;
      }>(`/dashboards/${dashboardId}`);
      setName(data.dashboard.name);
      setVersion(data.dashboard.currentVersion);
      setSpec(data.spec);
      if (data.spec?.widgets?.length) {
        const nextResults: Record<string, WidgetResult | null> = {};
        const nextErrors: Record<string, string | null> = {};
        await Promise.all(
          data.spec.widgets.map(async (widget) => {
            try {
              const exec = await api<{ result: WidgetResult }>(
                `/queries/${widget.queryId}/execute`,
                { method: 'POST' },
              );
              nextResults[widget.id] = exec.result;
              nextErrors[widget.id] = null;
            } catch (err) {
              nextResults[widget.id] = null;
              nextErrors[widget.id] = formatApiError(err, 'Failed');
            }
          }),
        );
        setResults(nextResults);
        setErrors(nextErrors);
      }
    } catch (err) {
      setError(formatApiError(err, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, [dashboardId]);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="flex h-full min-h-0 flex-col bg-[#0b1018]/95 text-[#e8edf4] backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-[#1FD1A0]">Live canvas</p>
          <h3 className="truncate font-display text-base font-semibold text-[#e8edf4]">{name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {version != null ? <Badge tone="success">v{version}</Badge> : null}
          <Button variant="secondary" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
          <Link href={`/workspace/dashboards/${dashboardId}`}>
            <Button variant="secondary">Open</Button>
          </Link>
          {onClose ? (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <InlineError>{error}</InlineError>
        {loading && !spec ? (
          <p className="text-sm text-ink-muted">Loading preview…</p>
        ) : !spec?.widgets?.length ? (
          <p className="text-sm text-ink-muted">No widgets yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {spec.widgets.map((widget) => {
              const Comp = widgetRegistry[widget.type];
              return (
                <div
                  key={widget.id}
                  className="panel min-h-[180px] overflow-hidden p-3"
                  style={{
                    gridColumn: `span ${Math.min(2, Math.max(1, Math.round(widget.position.width / 6)))}`,
                  }}
                >
                  {Comp ? (
                    <Comp
                      title={widget.title}
                      config={widget.config}
                      result={results[widget.id] ?? null}
                      loading={loading && !results[widget.id]}
                      error={errors[widget.id]}
                      timeZone={timeZone}
                    />
                  ) : (
                    <p className="text-sm text-red-600">Unknown widget: {widget.type}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.aside>
  );
}
