'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { useAppMode } from '@/lib/app-mode';
import { AgentSurfaceShell } from '@/components/agent/agent-surface-shell';
import { Button, EmptyState, Field, Input, Select } from '@/components/ui';

interface DataSource {
  id: string;
  name: string;
  introspectionStatus: string;
}

interface SemanticModel {
  id: string;
  name: string;
  dataSourceId: string;
}

export default function GenerateDashboardPage() {
  const { current } = useWorkspace();
  const { mode, ready } = useAppMode();
  const agent = mode === 'agent';
  const router = useRouter();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [models, setModels] = useState<SemanticModel[]>([]);
  const [dataSourceId, setDataSourceId] = useState('');
  const [semanticModelId, setSemanticModelId] = useState('');
  const [prompt, setPrompt] = useState('Show an overview of key metrics and breakdowns');
  const [useAi, setUseAi] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredModels = useMemo(
    () => models.filter((m) => m.dataSourceId === dataSourceId),
    [models, dataSourceId],
  );

  useEffect(() => {
    if (!current) return;
    Promise.all([
      api<{ dataSources: DataSource[] }>(`/data-sources?workspaceId=${current.id}`),
      api<{ models: SemanticModel[] }>(`/semantic-models?workspaceId=${current.id}`),
    ]).then(([ds, sm]) => {
      setDataSources(ds.dataSources);
      setModels(sm.models);
      if (ds.dataSources[0]) setDataSourceId(ds.dataSources[0].id);
    });
  }, [current?.id]);

  useEffect(() => {
    setSemanticModelId(filteredModels[0]?.id ?? '');
  }, [filteredModels]);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ dashboard: { id: string } }>('/ai/generate-dashboard', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: current.id,
          dataSourceId,
          semanticModelId: semanticModelId || undefined,
          prompt,
          useAi,
        }),
      });
      router.push(`/workspace/dashboards/${data.dashboard.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Generate dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">
          AI returns a JSON dashboard spec only. Queries are compiled and validated server-side.
        </p>
      </div>

      <form className="panel space-y-4 p-5" onSubmit={onSubmit}>
        <Field label="Prompt">
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} required />
        </Field>
        <Field label="Data source">
          <Select value={dataSourceId} onChange={(e) => setDataSourceId(e.target.value)} required>
            {dataSources.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
                {ds.introspectionStatus !== 'succeeded' ? ' (needs introspection)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Semantic model (optional)">
          <Select value={semanticModelId} onChange={(e) => setSemanticModelId(e.target.value)}>
            <option value="">None</option>
            {filteredModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
          Use AI provider (falls back to rules if unavailable)
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button disabled={busy || !dataSources.length}>
          {busy ? 'Generating…' : 'Generate'}
        </Button>
      </form>
    </div>
  );

  if (agent) {
    return <AgentSurfaceShell>{body}</AgentSurfaceShell>;
  }

  return body;
}
