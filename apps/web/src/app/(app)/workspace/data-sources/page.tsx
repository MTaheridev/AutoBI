'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Badge, Button, EmptyState } from '@/components/ui';

interface DataSource {
  id: string;
  name: string;
  type: string;
  host: string;
  database: string;
  connectionStatus: string;
  introspectionStatus: string;
}

function statusTone(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'connected' || status === 'succeeded') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'running') return 'warning';
  return 'neutral';
}

export default function DataSourcesPage() {
  const { current } = useWorkspace();
  const [items, setItems] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!current) return;
    setLoading(true);
    api<{ dataSources: DataSource[] }>(`/data-sources?workspaceId=${current.id}`)
      .then((data) => setItems(data.dataSources))
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
          <h1 className="font-display text-2xl font-semibold">Data sources</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Connect relational databases and inspect their schemas.
          </p>
        </div>
        <Link href="/workspace/data-sources/new">
          <Button>Add data source</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : !items.length ? (
        <EmptyState
          title="No data sources yet"
          description="Register PostgreSQL, MySQL, MariaDB, or SQL Server."
          action={
            <Link href="/workspace/data-sources/new">
              <Button>Add data source</Button>
            </Link>
          }
        />
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Host / DB</th>
                <th className="px-4 py-3 font-medium">Connection</th>
                <th className="px-4 py-3 font-medium">Schema</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ds) => (
                <tr key={ds.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-brand-700 hover:underline dark:text-brand-300"
                      href={`/workspace/data-sources/${ds.id}`}
                    >
                      {ds.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{ds.type}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {ds.host} / {ds.database}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(ds.connectionStatus)}>{ds.connectionStatus}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(ds.introspectionStatus)}>
                      {ds.introspectionStatus}
                    </Badge>
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
