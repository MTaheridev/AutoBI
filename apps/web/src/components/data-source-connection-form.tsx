'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { api, formatApiError } from '@/lib/api';
import {
  Button,
  Field,
  InlineError,
  InlineSuccess,
  InlineWarning,
  Input,
  Select,
} from '@/components/ui';

export const DATA_SOURCE_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432, defaultSchema: 'public' },
  { value: 'mysql', label: 'MySQL', defaultPort: 3306, defaultSchema: '' },
  { value: 'mariadb', label: 'MariaDB', defaultPort: 3306, defaultSchema: '' },
  { value: 'sqlserver', label: 'SQL Server', defaultPort: 1433, defaultSchema: 'dbo' },
] as const;

export type DataSourceTypeValue = (typeof DATA_SOURCE_TYPES)[number]['value'];

export type ConnectionFormValues = {
  name: string;
  type: DataSourceTypeValue;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema: string;
  ssl: boolean;
};

export type ConnectionTestResultDto = {
  ok: boolean;
  message: string;
  latencyMs?: number;
  serverVersion?: string;
  readonlyLikely?: boolean;
  warnings?: Array<{ code: string; message: string }>;
};

type Props = {
  workspaceId: string;
  mode: 'create' | 'edit';
  initial?: Partial<ConnectionFormValues>;
  /** When editing, merges blank password from this stored data source during test. */
  dataSourceId?: string;
  /** When editing, type is fixed to the stored connector. */
  lockType?: boolean;
  submitLabel: string;
  onSubmit: (values: ConnectionFormValues) => Promise<void>;
  /** Extra actions (e.g. delete) rendered next to primary buttons. */
  extraActions?: ReactNode;
  /**
   * Create mode: require a successful ephemeral test matching current values.
   * Edit mode: optional test before save; password may be blank to keep existing.
   */
  requireTestBeforeSubmit?: boolean;
};

function fingerprint(values: Omit<ConnectionFormValues, 'name'>) {
  return JSON.stringify({
    type: values.type,
    host: values.host,
    port: values.port,
    database: values.database,
    username: values.username,
    password: values.password,
    schema: values.schema,
    ssl: values.ssl,
  });
}

export function DataSourceConnectionForm({
  workspaceId,
  mode,
  initial,
  dataSourceId,
  lockType = false,
  submitLabel,
  onSubmit,
  extraActions,
  requireTestBeforeSubmit = mode === 'create',
}: Props) {
  const [type, setType] = useState<DataSourceTypeValue>(initial?.type ?? 'postgresql');
  const defaults = useMemo(() => DATA_SOURCE_TYPES.find((t) => t.value === type)!, [type]);
  const [name, setName] = useState(initial?.name ?? '');
  const [host, setHost] = useState(initial?.host ?? 'localhost');
  const [port, setPort] = useState(initial?.port ?? defaults.defaultPort);
  const [database, setDatabase] = useState(initial?.database ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [schema, setSchema] = useState(initial?.schema ?? defaults.defaultSchema);
  const [ssl, setSsl] = useState(initial?.ssl ?? false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testedFingerprint, setTestedFingerprint] = useState<string | null>(null);

  const values: ConnectionFormValues = {
    name,
    type,
    host,
    port,
    database,
    username,
    password,
    schema,
    ssl,
  };

  const currentFp = fingerprint(values);
  const testFresh = testedFingerprint === currentFp;

  useEffect(() => {
    // Changing connection fields invalidates the last successful test.
    if (testedFingerprint && testedFingerprint !== currentFp) {
      setTestedFingerprint(null);
      setMessage(null);
    }
  }, [currentFp, testedFingerprint]);

  function onTypeChange(next: DataSourceTypeValue) {
    if (lockType) return;
    setType(next);
    const meta = DATA_SOURCE_TYPES.find((t) => t.value === next)!;
    setPort(meta.defaultPort);
    setSchema(meta.defaultSchema);
  }

  async function runTest() {
    setTesting(true);
    setError(null);
    setMessage(null);
    setWarnings([]);
    try {
      if (mode === 'create' && !password.trim()) {
        setError('Password is required to test the connection.');
        return;
      }
      const data = await api<{ result: ConnectionTestResultDto }>('/data-sources/test', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId,
          type,
          ...(dataSourceId ? { dataSourceId } : {}),
          config: {
            host,
            port,
            database,
            username,
            ...(password.trim() ? { password } : {}),
            ssl,
            schema: schema || undefined,
          },
        }),
      });
      const result = data.result;
      if (!result.ok) {
        setError(result.message);
        setTestedFingerprint(null);
        return;
      }
      setMessage(
        [
          result.message,
          result.latencyMs != null ? `${result.latencyMs}ms` : null,
          result.serverVersion ? result.serverVersion.slice(0, 80) : null,
        ]
          .filter(Boolean)
          .join(' · '),
      );
      setWarnings((result.warnings ?? []).map((w) => w.message));
      setTestedFingerprint(fingerprint(values));
    } catch (err) {
      setError(formatApiError(err, 'Test failed'));
      setTestedFingerprint(null);
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (requireTestBeforeSubmit && !testFresh) {
      setError('Test the connection successfully before saving.');
      return;
    }
    if (mode === 'create' && !password.trim()) {
      setError('Password is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(formatApiError(err, mode === 'create' ? 'Failed to create data source' : 'Save failed'));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    !testing &&
    Boolean(name.trim()) &&
    (!requireTestBeforeSubmit || testFresh);

  return (
    <form className="panel space-y-4 p-5" onSubmit={handleSubmit}>
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Database type">
        <Select
          value={type}
          disabled={lockType}
          onChange={(e) => onTypeChange(e.target.value as DataSourceTypeValue)}
        >
          {DATA_SOURCE_TYPES.map((t) => (
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
            required={mode === 'create'}
            placeholder={mode === 'edit' ? 'Leave blank to keep current password' : undefined}
            autoComplete="new-password"
          />
        </Field>
      </div>
      <Field
        label={`Schema / namespace${defaults.defaultSchema ? ` (default ${defaults.defaultSchema})` : ''}`}
      >
        <Input value={schema} onChange={(e) => setSchema(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} />
        Use SSL
      </label>

      {message ? <InlineSuccess>{message}</InlineSuccess> : null}
      {warnings.map((w) => (
        <InlineWarning key={w}>{w}</InlineWarning>
      ))}
      <InlineError>{error}</InlineError>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" disabled={busy || testing} onClick={runTest}>
          {testing ? 'Testing…' : 'Test connection'}
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
        {extraActions}
      </div>
      {requireTestBeforeSubmit && !testFresh ? (
        <p className="data-mono text-xs text-ink-muted">
          Run a successful test on the current settings before creating.
        </p>
      ) : null}
    </form>
  );
}
