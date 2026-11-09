'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Badge, Button } from '@/components/ui';

interface QueryDto {
  id: string;
  name: string;
  compiledSql: string | null;
  dialect: string | null;
  plan: unknown;
}

interface RunDto {
  id: string;
  status: string;
  durationMs: number | null;
  rowCount: number | null;
  truncated: boolean;
  error: string | null;
  createdAt: string;
}

interface ResultPreview {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export default function QueryDetailPage() {
  const params = useParams<{ id: string }>();
  const [query, setQuery] = useState<QueryDto | null>(null);
  const [runs, setRuns] = useState<RunDto[]>([]);
  const [result, setResult] = useState<ResultPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ query: QueryDto; runs: RunDto[] }>(`/queries/${params.id}`);
    setQuery(data.query);
    setRuns(data.runs);
  }, [params.id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function compile() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{ compiled: { sql: string; dialect: string } }>(
        `/queries/${params.id}/compile`,
        { method: 'POST' },
      );
      setMessage(`Compiled for ${data.compiled.dialect}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Compile failed');
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{
        run: RunDto;
        result: ResultPreview;
      }>(`/queries/${params.id}/execute`, { method: 'POST' });
      setResult(data.result);
      setMessage(
        `Succeeded in ${data.run.durationMs ?? 0}ms · ${data.result.rowCount} rows${
          data.result.truncated ? ' (truncated)' : ''
        }`,
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Execute failed');
    } finally {
      setBusy(false);
    }
  }

  if (!query) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{query.name}</h1>
          <div className="mt-2 flex gap-2">
            <Badge>{query.dialect ?? 'uncompiled'}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={busy} onClick={compile}>
            Compile
          </Button>
          <Button disabled={busy} onClick={execute}>
            Execute
          </Button>
        </div>
      </div>

      {message && <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="panel p-5">
        <h2 className="font-medium">Compiled SQL</h2>
        <pre className="mt-3 overflow-auto rounded-xl bg-surface-muted p-4 text-xs">
          {query.compiledSql ?? 'Not compiled yet'}
        </pre>
      </div>

      <div className="panel p-5">
        <h2 className="font-medium">Plan</h2>
        <pre className="mt-3 overflow-auto rounded-xl bg-surface-muted p-4 text-xs">
          {JSON.stringify(query.plan, null, 2)}
        </pre>
      </div>

      {result && (
        <div className="panel overflow-auto">
          <div className="border-b border-line px-4 py-3 font-medium">Result preview</div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-ink-muted">
              <tr>
                {result.columns.map((c) => (
                  <th key={c} className="px-4 py-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {result.columns.map((c) => (
                    <td key={c} className="px-4 py-2">
                      {String(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="border-b border-line px-4 py-3 font-medium">Run history</div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface-muted/60 text-ink-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Rows</th>
              <th className="px-4 py-2 font-medium">Duration</th>
              <th className="px-4 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2">
                  <Badge
                    tone={
                      r.status === 'succeeded'
                        ? 'success'
                        : r.status === 'failed'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {r.status}
                  </Badge>
                  {r.error && <div className="mt-1 text-xs text-red-600">{r.error}</div>}
                </td>
                <td className="px-4 py-2">{r.rowCount ?? '—'}</td>
                <td className="px-4 py-2">{r.durationMs != null ? `${r.durationMs}ms` : '—'}</td>
                <td className="px-4 py-2 text-ink-muted">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {!runs.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                  No runs yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
