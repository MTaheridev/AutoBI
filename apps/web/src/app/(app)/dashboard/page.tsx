'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useWorkspace } from '@/lib/workspace';
import { Button, EmptyState, Field, Input } from '@/components/ui';

export default function DashboardPage() {
  const { current, workspaces, create, loading } = useWorkspace();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await create(name.trim());
      setName('');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading workspace…</p>;
  }

  if (!workspaces.length) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          title="Create your first workspace"
          description="Workspaces isolate data sources, AI settings, and future dashboards."
          action={
            <form className="mt-2 flex w-full max-w-sm gap-2" onSubmit={onCreate}>
              <Input
                placeholder="Workspace name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button disabled={creating}>{creating ? '…' : 'Create'}</Button>
            </form>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Welcome to {current?.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Connect databases and configure AI providers. Dashboard generation comes in a later sprint.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/workspace/data-sources" className="panel block p-5 transition hover:border-brand-400">
          <h2 className="font-medium">Data sources</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Register PostgreSQL, MySQL, MariaDB, or SQL Server connections.
          </p>
        </Link>
        <Link
          href="/workspace/semantic-models"
          className="panel block p-5 transition hover:border-brand-400"
        >
          <h2 className="font-medium">Semantics</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Propose and approve entities, metrics, and dimensions from schemas.
          </p>
        </Link>
        <Link href="/workspace/queries" className="panel block p-5 transition hover:border-brand-400">
          <h2 className="font-medium">Queries</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Compile validated plans to dialect SQL and execute safely.
          </p>
        </Link>
        <Link href="/workspace/dashboards" className="panel block p-5 transition hover:border-brand-400">
          <h2 className="font-medium">Dashboards</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Generate and edit versioned dashboard specs with a widget registry.
          </p>
        </Link>
        <Link href="/workspace/ai-settings" className="panel block p-5 transition hover:border-brand-400">
          <h2 className="font-medium">AI settings</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Store encrypted OpenAI or OpenRouter credentials for your workspace.
          </p>
        </Link>
      </div>
      <div className="panel p-5">
        <h2 className="font-medium">Create another workspace</h2>
        <form className="mt-3 flex max-w-md gap-2" onSubmit={onCreate}>
          <Field label="">
            <Input
              placeholder="New workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button disabled={creating}>{creating ? '…' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
