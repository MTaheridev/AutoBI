'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Boxes,
  Database,
  LayoutDashboard,
  Moon,
  PlayCircle,
  Settings,
  Sparkles,
  Sun,
  PanelsTopLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace';
import { Select } from './ui';

const links = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/workspace/data-sources', label: 'Data sources', icon: Database },
  { href: '/workspace/semantic-models', label: 'Semantics', icon: Boxes },
  { href: '/workspace/queries', label: 'Queries', icon: PlayCircle },
  { href: '/workspace/dashboards', label: 'Dashboards', icon: PanelsTopLeft },
  { href: '/workspace/ai-settings', label: 'AI settings', icon: Sparkles },
  { href: '/workspace/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { workspaces, current, setCurrentId } = useWorkspace();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-surface-elevated/80 backdrop-blur">
      <div className="border-b border-line px-5 py-5">
        <div className="font-display text-xl font-semibold tracking-tight text-brand-700 dark:text-brand-300">
          AutoBI
        </div>
        <p className="mt-1 text-xs text-ink-muted">Workspace intelligence</p>
      </div>

      <div className="border-b border-line px-4 py-3">
        <Select
          value={current?.id ?? ''}
          onChange={(e) => setCurrentId(e.target.value)}
          disabled={!workspaces.length}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
          {!workspaces.length && <option value="">No workspace</option>}
        </Select>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                active
                  ? 'bg-brand-600/10 font-medium text-brand-700 dark:text-brand-300'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          Toggle theme
        </button>
      </div>
    </aside>
  );
}
