'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Button, EmptyState, Field, Input, Select } from '@/components/ui';

const TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432, defaultSchema: 'public' },
  { value: 'mysql', label: 'MySQL', defaultPort: 3306, defaultSchema: '' },
  { value: 'mariadb', label: 'MariaDB', defaultPort: 3306, defaultSchema: '' },
  { value: 'sqlserver', label: 'SQL Server', defaultPort: 1433, defaultSchema: 'dbo' },
] as const;

export default function NewDataSourcePage() {
  const { current } = useWorkspace();
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]['value']>('postgresql');
  const defaults = useMemo(() => TYPES.find((t) => t.value === type)!, [type]);
  const [name, setName] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(5432);
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [schema, setSchema] = useState('public');
  const [ssl, setSsl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onTypeChange(next: (typeof TYPES)[number]['value']) {
    setType(next);
    const meta = TYPES.find((t) => t.value === next)!;
    setPort(meta.defaultPort);
    setSchema(meta.defaultSchema);
  }

  if (!current) {
    return (
      <EmptyState
        title="No workspace selected"
        description="Create a workspace from the home page first."
      />
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ dataSource: { id: string } }>('/data-sources', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: current.id,
          name,
          type,
          config: {
            host,
            port,
            database,
            username,
            password,
            ssl,
            schema: schema || undefined,
          },
        }),
      });
      router.push(`/workspace/data-sources/${data.dataSource.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create data source');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Add data source</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Credentials are encrypted at rest and never returned by the API.
        </p>
      </div>
      <form className="panel space-y-4 p-5" onSubmit={onSubmit}>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Database type">
          <Select
            value={type}
            onChange={(e) => onTypeChange(e.target.value as (typeof TYPES)[number]['value'])}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Host">
            <Input value={host} onChange={(e) => setHost(e.target.value)} required />
          </Field>
          <Field label="Port">
            <Input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Database">
            <Input value={database} onChange={(e) => setDatabase(e.target.value)} required />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
        </div>
        <Field label={`Schema / namespace${defaults.defaultSchema ? ` (default ${defaults.defaultSchema})` : ''}`}>
          <Input value={schema} onChange={(e) => setSchema(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} />
          Use SSL
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button disabled={busy}>{busy ? 'Saving…' : 'Save data source'}</Button>
      </form>
    </div>
  );
}
