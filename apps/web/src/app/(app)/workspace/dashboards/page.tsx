'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Badge, Button, EmptyState } from '@/components/ui';

interface DashboardItem {
  id: string;
  name: string;
  description: string | null;
  currentVersion: number;
  updatedAt: string;
}

export default function DashboardsPage() {
  const { current } = useWorkspace();
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!current) return;
    setLoading(true);
    api<{ dashboards: DashboardItem[] }>(`/dashboards?workspaceId=${current.id}`)
      .then((data) => setItems(data.dashboards))
      .finally(() => setLoading(false));
  }, [current?.id]);

  if (!current) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Create a workspace from the home page first."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Dashboards</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Versioned JSON specs rendered through a fixed widget registry.
          </p>
        </div>
        <Link href="/workspace/dashboards/generate">
          <Button>Generate dashboard</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : !items.length ? (
        <EmptyState
          title="No dashboards yet"
          description="Generate one from a natural-language prompt and an introspected data source."
          action={
            <Link href="/workspace/dashboards/generate">
              <Button>Generate dashboard</Button>
            </Link>
          }
        />
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-brand-700 hover:underline dark:text-brand-300"
                      href={`/workspace/dashboards/${d.id}`}
                    >
                      {d.name}
                    </Link>
                    {d.description && (
                      <div className="text-xs text-ink-muted">{d.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>v{d.currentVersion}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(d.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
