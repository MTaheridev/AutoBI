'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { Badge, Button } from '@/components/ui';

export default function WorkspaceSettingsPage() {
  const { current } = useWorkspace();
  const router = useRouter();

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Workspace settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Basic workspace details for Sprint 1.</p>
      </div>
      <div className="panel space-y-4 p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-muted">Name</div>
          <div className="mt-1 font-medium">{current?.name ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-muted">Your role</div>
          <div className="mt-1">
            <Badge>{current?.role ?? '—'}</Badge>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-muted">Workspace ID</div>
          <div className="mt-1 font-mono text-sm text-ink-muted">{current?.id ?? '—'}</div>
        </div>
      </div>
      <Button variant="secondary" onClick={logout}>
        Sign out
      </Button>
    </div>
  );
}
