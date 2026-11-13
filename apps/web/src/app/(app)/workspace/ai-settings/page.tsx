'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, formatApiError } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  InlineError,
  InlineSuccess,
  Input,
  PageHeader,
  Select,
} from '@/components/ui';

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
  const [editingId, setEditingId] = useState<string | null>(null);
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
    if (editingId) return;
    const models = providers.find((p) => p.name === provider)?.models ?? [];
    if (models[0] && !models.includes(model)) setModel(models[0]);
  }, [provider, providers, editingId, model]);

  if (!current) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Create a workspace from the home page first."
      />
    );
  }

  function resetForm() {
    setEditingId(null);
    setProvider('openai');
    setModel('gpt-4o-mini');
    setApiKey('');
  }

  function startEdit(c: Config) {
    setEditingId(c.id);
    setProvider(c.provider);
    setModel(c.model);
    setApiKey('');
    setError(null);
    setMessage(null);
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
          ...(editingId ? { configId: editingId } : {}),
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        }),
      });
      setApiKey('');
      setMessage(
        editingId
          ? apiKey.trim()
            ? 'Provider updated (API key rotated).'
            : 'Provider updated (existing key kept).'
          : 'Provider saved. API key is encrypted and never returned.',
      );
      setEditingId(null);
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Save failed'));
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
          apiKey: apiKey.trim() || undefined,
          configId: editingId || undefined,
        }),
      });
      setMessage(data.result.message);
      if (!data.result.ok) setError(data.result.message);
    } catch (err) {
      setError(formatApiError(err, 'Test failed'));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!current) return;
    if (!window.confirm('Remove this AI provider and its stored key?')) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/ai/providers/config/${id}?workspaceId=${current.id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      setMessage('Provider removed.');
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Delete failed'));
    } finally {
      setBusy(false);
    }
  }

  const modelOptions = providers.find((p) => p.name === provider)?.models ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="AI settings"
        description="Add your own OpenAI or OpenRouter API keys. Keys are encrypted at rest and never shown again."
      />

      <form className="panel space-y-4 p-5" onSubmit={onSave}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">{editingId ? 'Edit provider' : 'Add provider'}</h2>
          {editingId ? (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel edit
            </Button>
          ) : null}
        </div>
        <Field label="Provider" htmlFor="ai-provider">
          <Select
            id="ai-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={Boolean(editingId)}
          >
            {(providers.length
              ? providers
              : [
                  { name: 'openai', models: [] },
                  { name: 'openrouter', models: [] },
                ]
            ).map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Model" htmlFor="ai-model">
          <Select
            id="ai-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            {model && !modelOptions.includes(model) ? (
              <option value={model}>{model}</option>
            ) : null}
          </Select>
        </Field>
        <Field
          label={editingId ? 'API key (leave blank to keep current)' : 'API key'}
          htmlFor="ai-key"
        >
          <Input
            id="ai-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={editingId ? '•••••••• (unchanged)' : 'sk-... or or-...'}
            required={!editingId}
            autoComplete="off"
          />
        </Field>
        <InlineError>{error}</InlineError>
        <InlineSuccess>{message}</InlineSuccess>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : editingId ? 'Update' : 'Save'}
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={onTest}>
            Test connection
          </Button>
        </div>
      </form>

      <div className="panel space-y-4 p-5">
        <h2 className="font-medium">Saved configurations</h2>
        <div className="space-y-3">
          {configs.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line px-3 py-2"
            >
              <div>
                <div className="font-medium">{c.provider}</div>
                <div className="text-sm text-ink-muted">{c.model}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success">key stored</Badge>
                <Button variant="secondary" disabled={busy} onClick={() => startEdit(c)}>
                  Edit
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => onDelete(c.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {!configs.length ? (
            <p className="text-sm text-ink-muted">No providers yet. Add an API key above.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
