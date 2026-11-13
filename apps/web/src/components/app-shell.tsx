'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { WorkspaceProvider } from '@/lib/workspace';
import {
  isAgentSurfacePath,
  isWorkshopOnlyPath,
  useAppMode,
} from '@/lib/app-mode';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, setMode, ready } = useAppMode();
  /** Immersive Agent chrome when in agent mode on agent/dashboard routes. */
  const agentSurface = mode === 'agent' && isAgentSurfacePath(pathname);
  const showWorkshop = mode === 'workshop';

  useEffect(() => {
    if (!ready) return;
    // Opening Agent chat always returns to Agent mode.
    if (pathname.startsWith('/workspace/agent') && mode !== 'agent') {
      setMode('agent');
    }
    if (mode === 'agent' && isWorkshopOnlyPath(pathname)) {
      router.replace('/workspace/agent');
    }
  }, [mode, pathname, ready, router, setMode]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070a0f]">
        <p className="data-mono text-sm text-[#8b95a8]">Opening AutoBI…</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col md:flex-row',
        agentSurface ? 'agent-stage bg-[#070a0f]' : 'bg-surface',
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      {showWorkshop ? <Sidebar /> : null}
      <main
        id="main"
        className={cn(
          'page-enter min-w-0 flex-1 overflow-x-hidden overflow-y-auto',
          agentSurface ? 'px-0 py-0' : 'px-5 py-6 md:px-8 md:py-8',
        )}
      >
        <div
          className={cn(
            'min-w-0',
            agentSurface ? 'min-h-[100dvh] md:min-h-screen' : 'mx-auto max-w-6xl',
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<{ user: { id: string } }>('/auth/me')
      .then(() => setReady(true))
      .catch(() => router.replace('/login'));
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070a0f]">
        <p className="data-mono text-sm text-[#8b95a8]">Opening AutoBI…</p>
      </div>
    );
  }

  return (
    <WorkspaceProvider>
      <ShellInner>{children}</ShellInner>
    </WorkspaceProvider>
  );
}
