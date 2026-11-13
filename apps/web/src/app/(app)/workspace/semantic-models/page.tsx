'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Badge, Button, EmptyState, Field, Input, PageHeader, Select } from '@/components/ui';

interface DataSource {
  id: string;
  name: string;
  type: string;
  introspectionStatus: string;
}

interface SemanticModel {
  id: string;
  name: string;
  description: string | null;
  dataSourceId: string;
  version: number;
  counts?: {
    entities: number;
    metrics: number;
    dimensions: number;
    relationships: number;
  };
}

export default function SemanticModelsPage() {
  const { current } = useWorkspace();
  const [models, setModels] = useState<SemanticModel[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [name, setName] = useState('');
  const [dataSourceId, setDataSourceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!current) return;
    setLoading(true);
    try {
      const [modelsRes, dsRes] = await Promise.all([
        api<{ models: SemanticModel[] }>(`/semantic-models?workspaceId=${current.id}`),
        api<{ dataSources: DataSource[] }>(`/data-sources?workspaceId=${current.id}`),
      ]);
      setModels(modelsRes.models);
      setDataSources(dsRes.dataSources);
      if (!dataSourceId && dsRes.dataSources[0]) {
        setDataSourceId(dsRes.dataSources[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [current?.id]);

  if (!current) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Create a workspace from the home page first."
      />
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!current || !name.trim() || !dataSourceId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ model: SemanticModel }>('/semantic-models', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: current.id,
          dataSourceId,
          name: name.trim(),
        }),
      });
      setName('');
      window.location.href = `/workspace/semantic-models/${data.model.id}`;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create model');
    } finally {
      setBusy(false);
    }
  }

  const dsName = (id: string) => dataSources.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Semantic models"
        description="Propose business entities, metrics, and dimensions from introspected schemas. Approvals stay human-controlled."
      />

      <form className="panel grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto]" onSubmit={onCreate}>
        <Field label="Model name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Data source">
          <Select value={dataSourceId} onChange={(e) => setDataSourceId(e.target.value)} required>
            {!dataSources.length && <option value="">No data sources</option>}
            {dataSources.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
                {ds.introspectionStatus !== 'succeeded' ? ' (needs introspection)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button disabled={busy || !dataSources.length}>
            {busy ? 'Creating…' : 'Create model'}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600 md:col-span-3">{error}</p>}
      </form>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : !models.length ? (
        <EmptyState
          title="No semantic models yet"
          description="Create a model from a data source that has a schema snapshot, then run Propose."
        />
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Data source</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Counts</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-brand-700 hover:underline dark:text-brand-300"
                      href={`/workspace/semantic-models/${m.id}`}
                    >
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{dsName(m.dataSourceId)}</td>
                  <td className="px-4 py-3">
                    <Badge>v{m.version}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {m.counts
                      ? `${m.counts.entities}E · ${m.counts.metrics}M · ${m.counts.dimensions}D · ${m.counts.relationships}R`
                      : '—'}
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
