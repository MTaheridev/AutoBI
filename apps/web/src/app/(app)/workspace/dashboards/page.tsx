'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, LayoutDashboard, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { useAppMode } from '@/lib/app-mode';
import { formatDateTime } from '@/lib/format-display';
import { AgentSurfaceShell } from '@/components/agent/agent-surface-shell';
import { Badge, Button, EmptyState, PageHeader } from '@/components/ui';
import { cn } from '@/lib/utils';

interface DashboardItem {
  id: string;
  name: string;
  description: string | null;
  currentVersion: number;
  updatedAt: string;
}

export default function DashboardsPage() {
  const { current } = useWorkspace();
  const { mode, ready } = useAppMode();
  const agent = mode === 'agent';
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeZone = current?.timezone || 'UTC';

  useEffect(() => {
    if (!current) return;
    setLoading(true);
    setError(null);
    api<{ dashboards: DashboardItem[] }>(`/dashboards?workspaceId=${current.id}`)
      .then((data) => setItems(data.dashboards))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [current?.id]);

  if (!ready) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  if (!current) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Create a workspace from Agent Mode first."
      />
    );
  }

  const body = (
    <div className="space-y-6">
      {agent ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#e8edf4]">
              Dashboards
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[#8b95a8]">
              Boards the agent built for this workspace. Open one to explore.
            </p>
          </div>
          <Link href="/workspace/dashboards/generate">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-control bg-[#1FD1A0] px-3 py-2 text-sm font-medium text-[#04140f] hover:bg-[#3ae0b0]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Generate
            </button>
          </Link>
        </div>
      ) : (
        <PageHeader
          title="Dashboards"
          description="Open a board to explore widgets, refresh data, or edit with natural language."
          actions={
            <Link href="/workspace/dashboards/generate">
              <Button>
                <Plus className="h-4 w-4" aria-hidden />
                Generate
              </Button>
            </Link>
          }
        />
      )}

      {error ? (
        <p className={cn('text-sm', agent ? 'text-red-400' : 'text-red-600')} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={cn('text-sm', agent ? 'text-[#8b95a8]' : 'text-ink-muted')}>Loading…</p>
      ) : !items.length && !error ? (
        <EmptyState
          title="No dashboards yet"
          description="Ask Agent Mode to build one, or generate from a prompt."
          action={
            <div className="flex flex-wrap gap-2">
              <Link href="/workspace/agent">
                <Button>Ask Agent</Button>
              </Link>
              <Link href="/workspace/dashboards/generate">
                <Button variant="secondary">Generate</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <ul className="list-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => (
            <li key={d.id} className="list-stagger__item">
              <Link
                href={`/workspace/dashboards/${d.id}`}
                className={cn(
                  'group flex h-full flex-col gap-4 rounded-panel border p-5 transition focus-visible:outline-none focus-visible:ring-2',
                  agent
                    ? 'border-white/[0.08] bg-white/[0.03] hover:border-[#1FD1A0]/40 hover:bg-white/[0.05] focus-visible:ring-[#1FD1A0]/35'
                    : 'panel hover:border-brand-500/50 hover:shadow-md focus-visible:ring-brand-600/40',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-control',
                      agent
                        ? 'bg-[#1FD1A0]/15 text-[#1FD1A0]'
                        : 'bg-signal-soft text-brand-800 dark:text-brand-200',
                    )}
                  >
                    <LayoutDashboard className="h-5 w-5" aria-hidden />
                  </div>
                  <Badge>v{d.currentVersion}</Badge>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h2
                    className={cn(
                      'truncate font-display text-lg font-semibold tracking-tight',
                      agent ? 'text-[#e8edf4]' : 'text-ink group-hover:text-brand-700 dark:group-hover:text-brand-300',
                    )}
                  >
                    {d.name}
                  </h2>
                  <p
                    className={cn(
                      'line-clamp-2 text-sm leading-relaxed',
                      agent ? 'text-[#8b95a8]' : 'text-ink-muted',
                    )}
                  >
                    {d.description?.trim() || 'No description yet.'}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex items-center justify-between gap-2 border-t pt-3',
                    agent ? 'border-white/[0.06]' : 'border-line',
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-[11px]',
                      agent ? 'text-[#6f7a8d]' : 'text-ink-muted',
                    )}
                  >
                    {formatDateTime(new Date(d.updatedAt), { timeZone })}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium',
                      agent ? 'text-[#1FD1A0]' : 'text-brand-700 dark:text-brand-300',
                    )}
                  >
                    Open
                    <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (agent) {
    return <AgentSurfaceShell>{body}</AgentSurfaceShell>;
  }

  return body;
}
