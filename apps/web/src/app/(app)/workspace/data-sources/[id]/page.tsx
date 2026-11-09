'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Badge, Button, EmptyState } from '@/components/ui';

interface DataSource {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  connectionStatus: string;
  introspectionStatus: string;
  lastError: string | null;
}

interface Column {
  name: string;
  dataType: string;
  nativeDataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

interface Table {
  schema: string;
  name: string;
  type: 'table' | 'view';
  columns: Column[];
}

interface Snapshot {
  version: number;
  schemas: string[];
  tables: Table[];
  relationships: Array<{
    sourceSchema: string;
    sourceTable: string;
    sourceColumn: string;
    targetSchema: string;
    targetTable: string;
    targetColumn: string;
  }>;
}

export default function DataSourceDetailPage() {
  const params = useParams<{ id: string }>();
  const { current } = useWorkspace();
  const [ds, setDs] = useState<DataSource | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!current) return;
    const [dsRes, schemaRes] = await Promise.all([
      api<{ dataSource: DataSource }>(
        `/data-sources/${params.id}?workspaceId=${current.id}`,
      ),
      api<{ snapshot: Snapshot | null }>(
        `/data-sources/${params.id}/schema?workspaceId=${current.id}`,
      ),
    ]);
    setDs(dsRes.dataSource);
    setSnapshot(schemaRes.snapshot);
    if (schemaRes.snapshot?.tables[0] && !selected) {
      const t = schemaRes.snapshot.tables[0];
      setSelected(`${t.schema}.${t.name}`);
    }
  }, [current, params.id, selected]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  if (!current) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Create a workspace from the home page first."
      />
    );
  }

  if (!ds) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  async function testConnection() {
    if (!current) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{ result: { ok: boolean; message: string } }>(
        `/data-sources/${params.id}/test?workspaceId=${current.id}`,
        { method: 'POST' },
      );
      setMessage(data.result.message);
      if (!data.result.ok) setError(data.result.message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  async function runIntrospect() {
    if (!current) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const job = await api<{ jobId: string }>(
        `/data-sources/${params.id}/introspect?workspaceId=${current.id}`,
        { method: 'POST' },
      );
      setMessage(`Introspection queued (${job.jobId}). Polling…`);
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const status = await api<{ status: string; error?: string }>(
          `/data-sources/jobs/${job.jobId}`,
        );
        if (status.status === 'completed') {
          setMessage('Introspection completed');
          await load();
          break;
        }
        if (status.status === 'failed') {
          setError(status.error ?? 'Introspection failed');
          await load();
          break;
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Introspection failed');
    } finally {
      setBusy(false);
    }
  }

  const selectedTable = snapshot?.tables.find(
    (t) => `${t.schema}.${t.name}` === selected,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{ds.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {ds.type} · {ds.host}:{ds.port} / {ds.database} · user {ds.username}
          </p>
          <div className="mt-3 flex gap-2">
            <Badge
              tone={
                ds.connectionStatus === 'connected'
                  ? 'success'
                  : ds.connectionStatus === 'failed'
                    ? 'danger'
                    : 'neutral'
              }
            >
              connection: {ds.connectionStatus}
            </Badge>
            <Badge
              tone={
                ds.introspectionStatus === 'succeeded'
                  ? 'success'
                  : ds.introspectionStatus === 'failed'
                    ? 'danger'
                    : ds.introspectionStatus === 'running'
                      ? 'warning'
                      : 'neutral'
              }
            >
              schema: {ds.introspectionStatus}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={busy} onClick={testConnection}>
            Test connection
          </Button>
          <Button disabled={busy} onClick={runIntrospect}>
            Introspect schema
          </Button>
        </div>
      </div>

      {message && <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
      {(error || ds.lastError) && (
        <p className="text-sm text-red-600">{error ?? ds.lastError}</p>
      )}

      {!snapshot ? (
        <EmptyState
          title="No schema snapshot yet"
          description="Run introspection to discover schemas, tables, columns, and foreign keys."
          action={
            <Button disabled={busy} onClick={runIntrospect}>
              Introspect schema
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="panel max-h-[70vh] overflow-auto p-3">
            <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Tables (v{snapshot.version})
            </div>
            <ul className="space-y-1">
              {snapshot.tables.map((t) => {
                const key = `${t.schema}.${t.name}`;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                        selected === key
                          ? 'bg-brand-600/10 text-brand-700 dark:text-brand-300'
                          : 'hover:bg-surface-muted'
                      }`}
                      onClick={() => setSelected(key)}
                    >
                      <span className="text-ink-muted">{t.schema}.</span>
                      {t.name}
                      <span className="ml-1 text-xs text-ink-muted">({t.type})</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {!!snapshot.relationships.length && (
              <div className="mt-4 border-t border-line pt-3">
                <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Foreign keys ({snapshot.relationships.length})
                </div>
                <ul className="space-y-2 px-2 text-xs text-ink-muted">
                  {snapshot.relationships.slice(0, 20).map((r, i) => (
                    <li key={i}>
                      {r.sourceSchema}.{r.sourceTable}.{r.sourceColumn} → {r.targetSchema}.
                      {r.targetTable}.{r.targetColumn}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="panel overflow-auto">
            {selectedTable ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface-muted/60 text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Column</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Native</th>
                    <th className="px-4 py-3 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTable.columns.map((c) => (
                    <tr key={c.name} className="border-b border-line last:border-0">
                      <td className="px-4 py-2 font-medium">{c.name}</td>
                      <td className="px-4 py-2">{c.dataType}</td>
                      <td className="px-4 py-2 text-ink-muted">{c.nativeDataType}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {c.isPrimaryKey && <Badge>PK</Badge>}
                          {c.isForeignKey && <Badge tone="warning">FK</Badge>}
                          {c.nullable && <Badge tone="neutral">nullable</Badge>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-sm text-ink-muted">Select a table</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
