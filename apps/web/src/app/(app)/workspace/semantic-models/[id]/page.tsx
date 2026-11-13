'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Badge, Button, EmptyState } from '@/components/ui';

type Status = 'Proposed' | 'Approved' | 'Rejected';
type Tab = 'entities' | 'metrics' | 'dimensions' | 'relationships';

interface Model {
  id: string;
  name: string;
  description: string | null;
  version: number;
}

interface Entity {
  id: string;
  name: string;
  description: string | null;
  tableRef: string;
  status: Status;
  source: string;
}

interface Metric {
  id: string;
  name: string;
  description: string | null;
  expression: string;
  aggregation: string;
  entityName: string | null;
  status: Status;
  source: string;
}

interface Dimension {
  id: string;
  name: string;
  description: string | null;
  field: string;
  entityName: string | null;
  status: Status;
  source: string;
}

interface Relationship {
  id: string;
  name: string | null;
  fromEntity: string;
  toEntity: string;
  fromField: string;
  toField: string;
  status: Status;
  source: string;
}

function statusTone(status: Status): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'Approved') return 'success';
  if (status === 'Rejected') return 'danger';
  return 'warning';
}

export default function SemanticModelDetailPage() {
  const params = useParams<{ id: string }>();
  const [model, setModel] = useState<Model | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [tab, setTab] = useState<Tab>('entities');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{
      model: Model;
      entities: Entity[];
      metrics: Metric[];
      dimensions: Dimension[];
      relationships: Relationship[];
    }>(`/semantic-models/${params.id}`);
    setModel(data.model);
    setEntities(data.entities);
    setMetrics(data.metrics);
    setDimensions(data.dimensions);
    setRelationships(data.relationships);
  }, [params.id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const counts = useMemo(
    () => ({
      entities: entities.length,
      metrics: metrics.length,
      dimensions: dimensions.length,
      relationships: relationships.length,
      proposed:
        [...entities, ...metrics, ...dimensions, ...relationships].filter(
          (i) => i.status === 'Proposed',
        ).length,
      approved:
        [...entities, ...metrics, ...dimensions, ...relationships].filter(
          (i) => i.status === 'Approved',
        ).length,
    }),
    [entities, metrics, dimensions, relationships],
  );

  async function propose(useAi: boolean) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{
        proposalMeta: {
          source: string;
          provider: string | null;
          counts: Record<string, number>;
        };
      }>(`/semantic-models/${params.id}/propose`, {
        method: 'POST',
        body: JSON.stringify({ useAi }),
      });
      setMessage(
        `Proposed via ${data.proposalMeta.source}${
          data.proposalMeta.provider ? ` (${data.proposalMeta.provider})` : ''
        }. Approved items were kept.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Propose failed');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(kind: Tab, itemId: string, status: Status) {
    setBusy(true);
    setError(null);
    try {
      await api(`/semantic-models/${params.id}/${kind}/${itemId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function bulkApprove() {
    setBusy(true);
    setError(null);
    try {
      for (const kind of ['entities', 'metrics', 'dimensions', 'relationships'] as const) {
        await api(`/semantic-models/${params.id}/bulk-status`, {
          method: 'POST',
          body: JSON.stringify({
            kind,
            fromStatus: 'Proposed',
            toStatus: 'Approved',
          }),
        });
      }
      setMessage('All proposed items approved.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bulk approve failed');
    } finally {
      setBusy(false);
    }
  }

  if (!model) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  const rows =
    tab === 'entities'
      ? entities
      : tab === 'metrics'
        ? metrics
        : tab === 'dimensions'
          ? dimensions
          : relationships;

  const filtered = rows.filter((r) => (filter === 'all' ? true : r.status === filter));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{model.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Version {model.version} · {counts.proposed} proposed · {counts.approved} approved
          </p>
          {model.description && (
            <p className="mt-2 text-sm text-ink-muted">{model.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => propose(false)}>
            Propose (rules)
          </Button>
          <Button disabled={busy} onClick={() => propose(true)}>
            Propose with AI
          </Button>
          <Button variant="secondary" disabled={busy || !counts.proposed} onClick={bulkApprove}>
            Approve all proposed
          </Button>
        </div>
      </div>

      {message && <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!counts.entities && !counts.metrics && !counts.dimensions && !counts.relationships ? (
        <EmptyState
          title="No definitions yet"
          description="Run Propose to generate business concepts from the data source schema. AI proposals stay Proposed until you approve them."
          action={
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => propose(false)}>
                Propose (rules)
              </Button>
              <Button disabled={busy} onClick={() => propose(true)}>
                Propose with AI
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['entities', `Entities (${counts.entities})`],
                ['metrics', `Metrics (${counts.metrics})`],
                ['dimensions', `Dimensions (${counts.dimensions})`],
                ['relationships', `Relationships (${counts.relationships})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`rounded-control px-3 py-1.5 text-sm ${
                  tab === key
                    ? 'bg-brand-600/10 font-medium text-brand-700 dark:text-brand-300'
                    : 'text-ink-muted hover:bg-surface-muted'
                }`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto flex gap-1">
              {(['all', 'Proposed', 'Approved', 'Rejected'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`rounded-lg px-2 py-1 text-xs ${
                    filter === f ? 'bg-surface-muted font-medium' : 'text-ink-muted'
                  }`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="panel overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-muted/60 text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Definition</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const definition =
                    tab === 'entities'
                      ? (item as Entity).tableRef
                      : tab === 'metrics'
                        ? `${(item as Metric).aggregation}(${(item as Metric).expression})`
                        : tab === 'dimensions'
                          ? (item as Dimension).field
                          : `${(item as Relationship).fromField} → ${(item as Relationship).toField}`;

                  return (
                    <tr key={item.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.name ?? '—'}</div>
                        {'description' in item && item.description && (
                          <div className="text-xs text-ink-muted">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{definition}</td>
                      <td className="px-4 py-3">
                        <Badge>{item.source}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.status !== 'Approved' && (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => setStatus(tab, item.id, 'Approved')}
                            >
                              Approve
                            </Button>
                          )}
                          {item.status !== 'Rejected' && (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => setStatus(tab, item.id, 'Rejected')}
                            >
                              Reject
                            </Button>
                          )}
                          {item.status === 'Rejected' && (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => setStatus(tab, item.id, 'Proposed')}
                            >
                              Reopen
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                      No items in this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
