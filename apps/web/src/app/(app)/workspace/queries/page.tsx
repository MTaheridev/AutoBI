'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Badge, Button, EmptyState, PageHeader } from '@/components/ui';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    setLoading(true);
    setError(null);
    api<{ queries: QueryItem[] }>(`/queries?workspaceId=${current.id}`)
      .then((data) => setItems(data.queries))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
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
      <PageHeader
        title="Queries"
        description="Build validated analytical plans, compile dialect SQL, and execute safely."
        actions={
          <Link href="/workspace/queries/new">
            <Button>New query</Button>
          </Link>
        }
      />

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : !items.length && !error ? (
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
