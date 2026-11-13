'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Badge, Button, Field, Input, PageHeader, Select } from '@/components/ui';

const TIMEZONES = [
  'UTC',
  'Asia/Tehran',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export default function WorkspaceSettingsPage() {
  const { current, refresh } = useWorkspace();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Member' | 'Viewer'>('Member');
  const [timezone, setTimezone] = useState('UTC');
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canInvite = current?.role === 'Owner' || current?.role === 'Admin';
  const canEdit = canInvite;

  useEffect(() => {
    if (current?.timezone) setTimezone(current.timezone);
  }, [current?.timezone]);

  async function loadInvites() {
    if (!current || !canInvite) return;
    const data = await api<{ invites: Invite[] }>(`/workspaces/${current.id}/invites`);
    setInvites(data.invites);
  }

  useEffect(() => {
    loadInvites().catch(() => undefined);
  }, [current?.id, canInvite]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    setLastToken(null);
    try {
      const data = await api<{ invite: Invite & { token?: string } }>(
        `/workspaces/${current.id}/invites`,
        {
          method: 'POST',
          body: JSON.stringify({ email, role }),
        },
      );
      setLastToken(data.invite.token ?? null);
      setMessage(
        data.invite.token
          ? `Invite created for ${data.invite.email} (dev token below)`
          : `Invite email sent to ${data.invite.email}`,
      );
      setEmail('');
      await loadInvites();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invite failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveTimezone(e: FormEvent) {
    e.preventDefault();
    if (!current || !canEdit) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api(`/workspaces/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ timezone }),
      });
      await refresh();
      setMessage(`Timezone set to ${timezone}. Dashboards will convert datetimes to this zone.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update timezone');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Workspace settings"
        description="Timezone, members, invites, and account actions."
      />
      <div className="panel space-y-4 p-5">
        <div>
          <div className="text-xs text-ink-muted">Name</div>
          <div className="mt-1 font-medium">{current?.name ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs text-ink-muted">Your role</div>
          <div className="mt-1">
            <Badge>{current?.role ?? '—'}</Badge>
          </div>
        </div>
        <div>
          <div className="text-xs text-ink-muted">Workspace ID</div>
          <div className="mt-1 data-mono text-ink-muted">{current?.id ?? '—'}</div>
        </div>
      </div>

      <div className="panel space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">Timezone</h2>
        <p className="text-sm text-ink-muted">
          Dashboard datetimes are converted from UTC/source timestamps into this IANA timezone.
        </p>
        <form className="space-y-3" onSubmit={onSaveTimezone}>
          <Field label="Display timezone" htmlFor="workspace-tz">
            <Select
              id="workspace-tz"
              value={timezone}
              disabled={!canEdit || busy}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {!TIMEZONES.includes(timezone as (typeof TIMEZONES)[number]) ? (
                <option value={timezone}>{timezone}</option>
              ) : null}
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </Field>
          {canEdit ? (
            <Button type="submit" disabled={busy || timezone === current?.timezone}>
              {busy ? 'Saving…' : 'Save timezone'}
            </Button>
          ) : (
            <p className="text-xs text-ink-muted">Admin+ required to change timezone.</p>
          )}
        </form>
      </div>

      {canInvite ? (
        <div className="panel space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Invites</h2>
          <form className="space-y-3" onSubmit={onInvite}>
            <Field label="Email" htmlFor="invite-email">
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Role" htmlFor="invite-role">
              <Select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
              >
                {current?.role === 'Owner' ? <option value="Admin">Admin</option> : null}
                <option value="Member">Member</option>
                <option value="Viewer">Viewer</option>
              </Select>
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Create invite'}
            </Button>
          </form>
          {message ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
              {message}
            </p>
          ) : null}
          {lastToken ? (
            <p className="break-all font-mono text-xs text-ink-muted">
              Dev token (share out-of-band): {lastToken}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {invites.length ? (
            <ul className="space-y-2 text-sm">
              {invites.map((i) => (
                <li key={i.id} className="flex justify-between gap-2 border-b border-line py-2">
                  <span>
                    {i.email} · {i.role}
                  </span>
                  <span className="text-ink-muted">
                    expires {new Date(i.expiresAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">No pending invites.</p>
          )}
        </div>
      ) : null}

      <Button variant="secondary" onClick={logout}>
        Sign out
      </Button>
    </div>
  );
}
