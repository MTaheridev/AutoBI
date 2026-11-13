'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, formatApiError } from '@/lib/api';
import {
  Button,
  Field,
  InlineError,
  InlineSuccess,
  Input,
  Select,
} from '@/components/ui';

type ProviderInfo = { name: string; models: string[] };

export function AgentAiSetupCard({
  workspaceId,
  onSaved,
}: {
  workspaceId: string;
  onSaved: () => void;
}) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('gemini-3.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api<{ providers: ProviderInfo[] }>(`/ai/providers?workspaceId=${workspaceId}`)
      .then((data) => {
        setProviders(data.providers);
        const gemini = data.providers.find((p) => p.name === 'gemini');
        if (gemini?.models[0]) {
          setProvider('gemini');
          setModel(gemini.models[0]);
        }
      })
      .catch(() => undefined);
  }, [workspaceId]);

  const models =
    providers.find((p) => p.name === provider)?.models ??
    (provider === 'gemini'
      ? ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest']
      : []);

  async function onTest() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{ result: { ok: boolean; message: string } }>(
        '/ai/providers/test',
        {
          method: 'POST',
          body: JSON.stringify({
            workspaceId,
            provider,
            model,
            apiKey,
          }),
        },
      );
      if (!data.result.ok) setError(data.result.message);
      else setMessage(data.result.message);
    } catch (err) {
      setError(formatApiError(err, 'Test failed'));
    } finally {
      setBusy(false);
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api('/ai/providers/config', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId,
          provider,
          model,
          apiKey,
        }),
      });
      setMessage('AI provider saved');
      setApiKey('');
      onSaved();
    } catch (err) {
      setError(formatApiError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel space-y-3 p-4" onSubmit={onSave}>
      <div>
        <h3 className="font-display text-base font-semibold">Connect an AI provider</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Keys are encrypted at rest. Gemini is recommended for Agent Mode tool calling.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Provider">
          <Select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              const next = providers.find((p) => p.name === e.target.value)?.models[0];
              if (next) setModel(next);
            }}
          >
            {(providers.length
              ? providers.map((p) => p.name)
              : ['gemini', 'openai', 'openrouter']
            ).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Model">
          <Select value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="API key">
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
          placeholder={provider === 'gemini' ? 'AQ.… or AIza…' : 'sk-…'}
          autoComplete="off"
        />
      </Field>
      <InlineError>{error}</InlineError>
      <InlineSuccess>{message}</InlineSuccess>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={busy || !apiKey} onClick={onTest}>
          Test
        </Button>
        <Button type="submit" disabled={busy || !apiKey}>
          {busy ? 'Saving…' : 'Save & continue'}
        </Button>
      </div>
    </form>
  );
}
