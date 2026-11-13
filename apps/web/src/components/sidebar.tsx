'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Boxes,
  Bot,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PlayCircle,
  Settings,
  Sparkles,
  Sun,
  PanelsTopLeft,
  Wrench,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { useAppMode } from '@/lib/app-mode';
import { Select } from './ui';

const workshopLinks = [
  { href: '/dashboard', label: 'Workshop home', icon: LayoutDashboard },
  { href: '/workspace/data-sources', label: 'Data sources', icon: Database },
  { href: '/workspace/semantic-models', label: 'Semantics', icon: Boxes },
  { href: '/workspace/queries', label: 'Queries', icon: PlayCircle },
  { href: '/workspace/dashboards', label: 'Dashboards', icon: PanelsTopLeft },
  { href: '/workspace/ai-settings', label: 'AI settings', icon: Sparkles },
  { href: '/workspace/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { workspaces, current, setCurrentId } = useWorkspace();
  const { mode, setMode } = useAppMode();
  const [open, setOpen] = useState(false);

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/login');
  }

  function enterAgent() {
    setMode('agent');
    setOpen(false);
    router.push('/workspace/agent');
  }

  /** Workshop chrome only — Agent Mode never shows this rail. */
  if (mode !== 'workshop') {
    return null;
  }

  const nav = (
    <>
      <div className="border-b border-line px-4 py-5">
        <Link
          href="/workspace/agent"
          onClick={() => setMode('agent')}
          className="font-display text-xl font-semibold tracking-tight text-ink"
        >
          AutoBI
        </Link>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
          <Wrench className="h-3 w-3" aria-hidden />
          Workshop
        </p>
      </div>

      <div className="border-b border-line px-3 py-3">
        <label htmlFor="workspace-select" className="sr-only">
          Workspace
        </label>
        <Select
          id="workspace-select"
          value={current?.id ?? ''}
          onChange={(e) => setCurrentId(e.target.value)}
          disabled={!workspaces.length}
          aria-label="Select workspace"
          className="text-sm"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
          {!workspaces.length && <option value="">No workspace</option>}
        </Select>
      </div>

      <div className="border-b border-line p-2">
        <button
          type="button"
          onClick={enterAgent}
          className="flex w-full items-center gap-2.5 rounded-control border border-signal/40 bg-signal-soft px-2.5 py-2.5 text-sm font-medium text-brand-800 transition hover:border-signal dark:text-brand-200"
        >
          <Bot className="h-4 w-4 shrink-0" aria-hidden />
          Back to Agent
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 p-2" aria-label="Workshop">
        {workshopLinks.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                'app-nav-link flex items-center gap-2.5 rounded-control px-2.5 py-2 text-sm transition',
                active
                  ? 'bg-signal-soft font-medium text-brand-800 dark:text-brand-200'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-line p-2">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" aria-hidden />
          ) : (
            <Moon className="h-4 w-4" aria-hidden />
          )}
          Toggle theme
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line bg-surface-elevated px-4 py-3 md:hidden">
        <button
          type="button"
          className="rounded-control p-2 text-ink-muted hover:bg-surface-muted"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
        <span className="font-display text-lg font-semibold tracking-tight">Workshop</span>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          'instrument-rail fixed inset-y-0 left-0 z-50 flex w-[15.5rem] flex-col transition-transform md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {nav}
      </aside>
    </>
  );
}
