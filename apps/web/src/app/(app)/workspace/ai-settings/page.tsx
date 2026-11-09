'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Badge, Button, EmptyState, Field, Input, Select } from '@/components/ui';

interface ProviderInfo {
  name: string;
  models: string[];
}

interface Config {
  id: string;
  provider: string;
  model: string;
  hasKey: true;
}

export default function AiSettingsPage() {
  const { current } = useWorkspace();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!current) return;
    const data = await api<{ providers: ProviderInfo[]; configs: Config[] }>(
      `/ai/providers?workspaceId=${current.id}`,
    );
    setProviders(data.providers);
    setConfigs(data.configs);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, [current?.id]);

  useEffect(() => {
    const models = providers.find((p) => p.name === provider)?.models ?? [];
    if (models[0]) setModel(models[0]);
  }, [provider, providers]);

  if (!current) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Create a workspace from the home page first."
      />
    );
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api('/ai/providers/config', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: current.id,
          provider,
          model,
          apiKey,
        }),
      });
      setApiKey('');
      setMessage('Provider saved. API key is encrypted and never returned.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    if (!current) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{ result: { ok: boolean; message: string } }>('/ai/providers/test', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: current.id,
          provider,
          model,
          apiKey: apiKey || undefined,
        }),
      });
      setMessage(data.result.message);
      if (!data.result.ok) setError(data.result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!current) return;
    await api(`/ai/providers/config/${id}?workspaceId=${current.id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">AI settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Configure workspace-level AI providers. Keys are encrypted at rest.
        </p>
      </div>

      <form className="panel space-y-4 p-5" onSubmit={onSave}>
        <Field label="Provider">
          <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
            {providers.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Model">
          <Select value={model} onChange={(e) => setModel(e.target.value)}>
            {(providers.find((p) => p.name === provider)?.models ?? []).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="API key">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            required
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            Save
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={onTest}>
            Test connection
          </Button>
        </div>
      </form>

      <div className="panel p-5">
        <h2 className="font-medium">Saved configurations</h2>
        <div className="mt-4 space-y-3">
          {configs.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-line px-3 py-2"
            >
              <div>
                <div className="font-medium">{c.provider}</div>
                <div className="text-sm text-ink-muted">{c.model}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="success">key stored</Badge>
                <Button variant="ghost" onClick={() => onDelete(c.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {!configs.length && (
            <p className="text-sm text-ink-muted">No providers configured yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
