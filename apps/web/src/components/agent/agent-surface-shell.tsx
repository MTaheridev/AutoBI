'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { LayoutDashboard, LogOut, Moon, Sun, Wrench } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { api } from '@/lib/api';
import { useAppMode } from '@/lib/app-mode';
import { useWorkspace } from '@/lib/workspace';
import { cn } from '@/lib/utils';

const GradientText = dynamic(() => import('@/components/bits/GradientText'), { ssr: false });
const DotGrid = dynamic(() => import('@/components/bits/DotGrid'), { ssr: false });

export function AgentSurfaceShell({
  children,
  /** Extra header controls (e.g. model pill). */
  headerEnd,
  /** Full-bleed: no content padding (Agent chat). */
  flush = false,
  /** Show soft DotGrid stage behind content. */
  showStage = true,
  /** Show the small Workshop escape hatch. Default on. */
  showWorkshop = true,
}: {
  children: ReactNode;
  headerEnd?: ReactNode;
  flush?: boolean;
  showStage?: boolean;
  showWorkshop?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { current } = useWorkspace();
  const { setMode } = useAppMode();
  const onAgent = pathname.startsWith('/workspace/agent');
  const onDashboards = pathname.startsWith('/workspace/dashboards');

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/login');
  }

  function enterWorkshop() {
    setMode('workshop');
    router.push('/dashboard');
  }

  return (
    <div className="dark relative flex h-[100dvh] min-h-0 flex-col overflow-hidden text-[#e8edf4] md:h-screen">
      {showStage ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_12%_-10%,rgba(31,209,160,0.16),transparent_55%),radial-gradient(700px_420px_at_100%_0%,rgba(58,91,255,0.12),transparent_50%),linear-gradient(180deg,#070a0f_0%,#0a1018_100%)]" />
          <div className="absolute inset-0 opacity-40">
            <DotGrid
              dotSize={2.5}
              gap={26}
              baseColor="#243044"
              activeColor="#1FD1A0"
              proximity={140}
              glow={0.4}
              opacity={0.75}
            />
          </div>
          <div className="agent-horizon absolute inset-x-0 bottom-0 h-40 opacity-70" />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#070a0f_0%,#0a1018_100%)]" />
      )}

      <header className="relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-black/20 px-4 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/workspace/agent" className="shrink-0">
            <GradientText
              colors={['#0F6E56', '#1FD1A0', '#5B8CFF']}
              animationSpeed={7}
              className="font-display text-lg font-semibold tracking-tight"
            >
              AutoBI
            </GradientText>
          </Link>
          {current?.name ? (
            <span className="hidden truncate font-mono text-[11px] text-[#6f7a8d] sm:inline">
              {current.name}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {headerEnd}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-control p-2 text-[#8b95a8] hover:bg-white/[0.05] hover:text-[#e8edf4]"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            href="/workspace/dashboards"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1.5 text-xs transition',
              onDashboards
                ? 'border-[#1FD1A0]/40 bg-[#1FD1A0]/10 text-[#e8edf4]'
                : 'border-white/10 bg-white/[0.03] text-[#a7b0c0] hover:border-[#1FD1A0]/40 hover:text-[#e8edf4]',
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
            Dashboards
          </Link>
          {showWorkshop ? (
            <button
              type="button"
              onClick={enterWorkshop}
              className="rounded-control p-2 text-[#6f7a8d] hover:bg-white/[0.05] hover:text-[#a7b0c0]"
              title="Workshop (manual tools)"
              aria-label="Open Workshop"
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="rounded-control p-2 text-[#8b95a8] hover:bg-white/[0.05] hover:text-[#e8edf4]"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Keep Agent nav subtle — only highlight when not already on Agent chat */}
      {!onAgent ? (
        <div className="relative z-10 border-b border-white/[0.04] bg-black/10 px-4 py-1.5 sm:px-6">
          <Link
            href="/workspace/agent"
            className="font-mono text-[11px] text-[#1FD1A0] hover:underline"
          >
            ← Back to Agent
          </Link>
        </div>
      ) : null}

      <div
        className={cn(
          'relative z-10 flex min-h-0 min-w-0 flex-1 flex-col',
          !flush && 'overflow-auto px-4 py-6 sm:px-6 lg:px-8',
        )}
      >
        {children}
      </div>
    </div>
  );
}
