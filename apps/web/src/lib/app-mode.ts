'use client';

import { useCallback, useEffect, useState } from 'react';

export type AppMode = 'agent' | 'workshop';

const STORAGE_KEY = 'autobi_app_mode';

/** Routes that belong to the Agent product surface (no workshop sidebar). */
export function isAgentSurfacePath(pathname: string): boolean {
  if (pathname.startsWith('/workspace/agent')) return true;
  if (pathname.startsWith('/workspace/dashboards')) return true;
  return false;
}

/** Manual/dev tool routes — agent-mode users are redirected away. */
export function isWorkshopOnlyPath(pathname: string): boolean {
  if (pathname.startsWith('/workspace/agent')) return false;
  if (pathname.startsWith('/workspace/dashboards')) return false;
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return true;
  if (pathname.startsWith('/workspace/data-sources')) return true;
  if (pathname.startsWith('/workspace/semantic-models')) return true;
  if (pathname.startsWith('/workspace/queries')) return true;
  if (pathname.startsWith('/workspace/ai-settings')) return true;
  if (pathname.startsWith('/workspace/settings')) return true;
  return false;
}

export function readAppMode(): AppMode {
  if (typeof window === 'undefined') return 'agent';
  return window.localStorage.getItem(STORAGE_KEY) === 'workshop' ? 'workshop' : 'agent';
}

export function writeAppMode(mode: AppMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, mode);
}

/** Persist agent vs workshop shell. Default is agent. */
export function useAppMode() {
  const [mode, setModeState] = useState<AppMode>('agent');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setModeState(readAppMode());
    setReady(true);
  }, []);

  const setMode = useCallback((next: AppMode) => {
    writeAppMode(next);
    setModeState(next);
  }, []);

  return { mode, setMode, ready };
}
