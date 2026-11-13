'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { useAppMode } from '@/lib/app-mode';
import { Button, EmptyState, Input, PageHeader } from '@/components/ui';

const destinations = [
  {
    href: '/workspace/data-sources',
    title: 'Data sources',
    description: 'Register PostgreSQL, MySQL, MariaDB, or SQL Server connections.',
  },
  {
    href: '/workspace/semantic-models',
    title: 'Semantics',
    description: 'Propose and approve entities, metrics, and dimensions.',
  },
  {
    href: '/workspace/queries',
    title: 'Queries',
    description: 'Compile validated plans to dialect SQL and execute safely.',
  },
  {
    href: '/workspace/dashboards',
    title: 'Dashboards',
    description: 'Browse and edit versioned dashboard specs.',
  },
  {
    href: '/workspace/ai-settings',
    title: 'AI settings',
    description: 'Manage encrypted provider keys for this workspace.',
  },
  {
    href: '/workspace/settings',
    title: 'Settings',
    description: 'Timezone, invites, and account actions.',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { setMode } = useAppMode();
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

  function backToAgent() {
    setMode('agent');
    router.push('/workspace/agent');
  }

  if (loading) {
    return <p className="data-mono text-sm text-ink-muted">Loading workspace…</p>;
  }

  if (!workspaces.length) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          title="Create your first workspace"
          description="Workspaces isolate data sources, AI settings, and dashboards."
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
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Workshop"
          description={`Manual tools for ${current?.name ?? 'this workspace'}. Prefer Agent Mode for day-to-day work.`}
        />
        <Button variant="secondary" onClick={backToAgent}>
          <Bot className="h-4 w-4" aria-hidden />
          Back to Agent
        </Button>
      </div>

      <ul className="list-stagger divide-y divide-line border-y border-line">
        {destinations.map((item) => (
          <li key={item.href} className="list-stagger__item">
            <Link
              href={item.href}
              className="flex flex-col gap-1 py-4 transition hover:bg-surface-muted/60 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
            >
              <span className="font-medium text-ink">{item.title}</span>
              <span className="max-w-xl text-sm text-ink-muted">{item.description}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 border-t border-line pt-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">Create another workspace</h2>
        <form className="mt-3 flex max-w-md gap-2" onSubmit={onCreate}>
          <Input
            placeholder="New workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="New workspace name"
          />
          <Button disabled={creating}>{creating ? '…' : 'Create'}</Button>
        </form>
      </div>
    </div>
  );
}
