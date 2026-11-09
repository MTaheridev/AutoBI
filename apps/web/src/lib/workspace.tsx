'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  role: string;
  createdAt: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  current: Workspace | null;
  loading: boolean;
  setCurrentId: (id: string) => void;
  refresh: () => Promise<void>;
  create: (name: string) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const STORAGE_KEY = 'autobi_workspace_id';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api<{ workspaces: Workspace[] }>('/workspaces');
    setWorkspaces(data.workspaces);
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const preferred =
      data.workspaces.find((w) => w.id === stored)?.id ?? data.workspaces[0]?.id ?? null;
    setCurrentIdState(preferred);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  const setCurrentId = useCallback((id: string) => {
    setCurrentIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const create = useCallback(async (name: string) => {
    const data = await api<{ workspace: Workspace }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setWorkspaces((prev) => [...prev, data.workspace]);
    setCurrentId(data.workspace.id);
    return data.workspace;
  }, [setCurrentId]);

  const value = useMemo(
    () => ({
      workspaces,
      current: workspaces.find((w) => w.id === currentId) ?? null,
      loading,
      setCurrentId,
      refresh,
      create,
    }),
    [workspaces, currentId, loading, setCurrentId, refresh, create],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
