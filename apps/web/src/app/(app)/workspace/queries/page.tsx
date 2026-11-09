'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Badge, Button, EmptyState } from '@/components/ui';

interface QueryItem {
  id: string;
  name: string;
  dataSourceId: string;
  dialect: string | null;
  updatedAt: string;
}

export default function QueriesPage() {
  const { current } = useWorkspace();
  const [items, setItems] = useState<QueryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!current) return;
    setLoading(true);
    api<{ queries: QueryItem[] }>(`/queries?workspaceId=${current.id}`)
      .then((data) => setItems(data.queries))
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
          <h1 className="font-display text-2xl font-semibold">Queries</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Build validated analytical plans, compile dialect SQL, and execute safely.
          </p>
        </div>
        <Link href="/workspace/queries/new">
          <Button>New query</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : !items.length ? (
        <EmptyState
          title="No queries yet"
          description="Create a query plan from schema fields or approved metrics."
          action={
            <Link href="/workspace/queries/new">
              <Button>New query</Button>
            </Link>
          }
        />
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Dialect</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-brand-700 hover:underline dark:text-brand-300"
                      href={`/workspace/queries/${q.id}`}
                    >
                      {q.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{q.dialect ?? '—'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(q.updatedAt).toLocaleString()}
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
