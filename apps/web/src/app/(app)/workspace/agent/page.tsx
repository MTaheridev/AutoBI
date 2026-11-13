'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api, formatApiError } from '@/lib/api';
import {
  streamAgentAnswer,
  streamAgentChat,
  type AgentAskState,
  type AgentStreamEvent,
} from '@/lib/agent-stream';
import { useWorkspace } from '@/lib/workspace';
import { Button, EmptyState, InlineError, Input } from '@/components/ui';
import { AgentAiSetupCard } from '@/components/agent/agent-ai-setup-card';
import { AgentSurfaceShell } from '@/components/agent/agent-surface-shell';
import {
  AgentSessionRail,
  type AgentConversationSummary,
} from '@/components/agent/agent-session-rail';
import {
  AgentStream,
  type ChatBubble,
  type TraceStep,
} from '@/components/agent/agent-stream';
import { AgentAskCard } from '@/components/agent/agent-ask-card';
import { AgentLiveCanvas } from '@/components/agent/agent-live-canvas';

const DotGrid = dynamic(() => import('@/components/bits/DotGrid'), { ssr: false });
const BlurText = dynamic(() => import('@/components/bits/BlurText'), { ssr: false });

type AiConfig = { id: string; provider: string; model: string };

const STARTER_PROMPTS = [
  'What databases and dashboards are already in this workspace?',
  'Get to know our connected database, then propose a semantic model',
  'Build a purchases dashboard with store and wallet names',
];

export default function AgentPage() {
  const { current, workspaces, create, loading: wsLoading } = useWorkspace();
  const [conversations, setConversations] = useState<AgentConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [traces, setTraces] = useState<TraceStep[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingAsk, setPendingAsk] = useState<AgentAskState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [wsName, setWsName] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMeta = useCallback(async () => {
    if (!current) return;
    const [convRes, aiRes] = await Promise.all([
      api<{ conversations: AgentConversationSummary[] }>(
        `/agent/conversations?workspaceId=${current.id}`,
      ),
      api<{ configs: AiConfig[] }>(`/ai/providers?workspaceId=${current.id}`),
    ]);
    setConversations(convRes.conversations);
    setConfigs(aiRes.configs);
    setShowSetup(aiRes.configs.length === 0);
  }, [current]);

  useEffect(() => {
    if (!current) return;
    loadMeta().catch((err) => setError(formatApiError(err, 'Failed to load agent state')));
  }, [loadMeta, current]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles, traces, status, pendingAsk]);

  function handleStreamEvent(event: AgentStreamEvent) {
    if (event.type === 'status') {
      setStatus(event.message);
    } else if (event.type === 'tool_start') {
      setStatus(`Running ${event.name}…`);
      setTraces((prev) => [
        ...prev,
        {
          id: event.id,
          name: event.name,
          arguments: event.arguments,
          status: 'running',
        },
      ]);
    } else if (event.type === 'tool_end') {
      setTraces((prev) =>
        prev.map((t) =>
          t.id === event.id
            ? {
                ...t,
                status: event.ok ? 'ok' : 'error',
                latencyMs: event.latencyMs,
                result: event.result,
                error: event.error,
              }
            : t,
        ),
      );
    } else if (event.type === 'artifact') {
      if (event.artifact.type === 'dashboard') {
        setDashboardId(event.artifact.id);
      }
    } else if (event.type === 'message') {
      setBubbles((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: event.content,
        },
      ]);
    } else if (event.type === 'ask') {
      setPendingAsk({
        askId: event.askId,
        question: event.question,
        options: event.options,
        allowMultiple: event.allowMultiple,
      });
      setStatus('Waiting for your answer…');
    } else if (event.type === 'awaiting_input') {
      setActiveId(event.conversationId);
      setBusy(false);
    } else if (event.type === 'done') {
      setActiveId(event.conversationId);
      setPendingAsk(null);
      setStatus(null);
    } else if (event.type === 'error') {
      setError(event.message);
      setStatus(null);
    }
  }

  async function selectConversation(id: string) {
    if (!current) return;
    setActiveId(id);
    setError(null);
    setPendingAsk(null);
    try {
      const data = await api<{
        conversation: { pendingAsk?: AgentAskState | null };
        messages: Array<{
          id: string;
          role: string;
          content: string;
          metadata?: Record<string, unknown> | null;
        }>;
      }>(`/agent/conversations/${id}?workspaceId=${current.id}`);

      const nextBubbles: ChatBubble[] = [];
      const nextTraces: TraceStep[] = [];
      let latestDashboard: string | null = null;

      for (const m of data.messages) {
        if (m.role === 'user') {
          nextBubbles.push({ id: m.id, role: 'user', content: m.content });
        } else if (m.role === 'assistant') {
          const calls =
            (m.metadata?.toolCalls as Array<{
              id: string;
              name: string;
              arguments: Record<string, unknown>;
            }>) ?? [];
          if (m.content) {
            nextBubbles.push({ id: m.id, role: 'assistant', content: m.content });
          }
          for (const c of calls) {
            nextTraces.push({
              id: c.id,
              name: c.name,
              arguments: c.arguments ?? {},
              status: 'ok',
            });
          }
        } else if (m.role === 'tool') {
          const callId = m.metadata?.toolCallId as string | undefined;
          const idx = nextTraces.findIndex((t) => t.id === callId);
          let parsed: {
            ok?: boolean;
            data?: unknown;
            error?: string;
            artifacts?: Array<{ type: string; id: string }>;
          } = {};
          try {
            parsed = JSON.parse(m.content);
          } catch {
            parsed = {};
          }
          for (const a of parsed.artifacts ?? []) {
            if (a.type === 'dashboard') latestDashboard = a.id;
          }
          if (idx >= 0) {
            nextTraces[idx] = {
              ...nextTraces[idx]!,
              status: parsed.ok === false ? 'error' : 'ok',
              latencyMs: m.metadata?.latencyMs as number | undefined,
              result: parsed.data,
              error: parsed.error,
            };
          }
        }
      }

      setBubbles(nextBubbles);
      setTraces(nextTraces);
      setDashboardId(latestDashboard);
      if (data.conversation.pendingAsk) {
        setPendingAsk(data.conversation.pendingAsk);
      }
    } catch (err) {
      setError(formatApiError(err, 'Failed to load conversation'));
    }
  }

  function startNew() {
    setActiveId(null);
    setBubbles([]);
    setTraces([]);
    setDashboardId(null);
    setPendingAsk(null);
    setError(null);
  }

  async function sendMessage(text: string) {
    if (!current || !text.trim() || busy || pendingAsk) return;
    setBusy(true);
    setError(null);
    setPrompt('');

    setBubbles((prev) => [
      ...prev,
      { id: `local_${Date.now()}`, role: 'user', content: text.trim() },
    ]);
    setStatus('Starting agent…');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamAgentChat(
        {
          workspaceId: current.id,
          conversationId: activeId ?? undefined,
          message: text.trim(),
        },
        handleStreamEvent,
        controller.signal,
      );
      await loadMeta();
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setError(formatApiError(err, 'Agent request failed'));
      }
      setStatus(null);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function submitAsk(selectedOptionIds: string[], freeText?: string) {
    if (!current || !activeId || !pendingAsk || busy) return;
    const ask = pendingAsk;
    const labels = ask.options
      .filter((o) => selectedOptionIds.includes(o.id))
      .map((o) => o.label);
    const answerText = ['Answer:', ...labels, freeText].filter(Boolean).join(' ');

    setBubbles((prev) => [
      ...prev,
      { id: `ans_${Date.now()}`, role: 'user', content: answerText },
    ]);
    setPendingAsk(null);
    setBusy(true);
    setError(null);
    setStatus('Continuing…');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamAgentAnswer(
        {
          workspaceId: current.id,
          conversationId: activeId,
          askId: ask.askId,
          selectedOptionIds,
          freeText,
        },
        handleStreamEvent,
        controller.signal,
      );
      await loadMeta();
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setError(formatApiError(err, 'Failed to submit answer'));
      }
      setStatus(null);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function onCreateWorkspace(e: FormEvent) {
    e.preventDefault();
    if (!wsName.trim()) return;
    setCreatingWs(true);
    try {
      await create(wsName.trim());
      setWsName('');
    } finally {
      setCreatingWs(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(prompt);
  }

  if (wsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-sm text-[#8b95a8]">Loading workspace…</p>
      </div>
    );
  }

  if (!workspaces.length) {
    return (
      <div className="relative flex h-full items-center justify-center px-6">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <DotGrid
            dotSize={3}
            gap={24}
            baseColor="#1a2230"
            activeColor="#1FD1A0"
            proximity={120}
            glow={0.3}
            opacity={0.65}
          />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <EmptyState
            title="Name your workspace"
            description="Agent Mode needs a workspace before it can connect databases or build dashboards."
            action={
              <form className="mt-2 flex w-full max-w-sm gap-2" onSubmit={onCreateWorkspace}>
                <Input
                  placeholder="e.g. Employee Credit System"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="border-white/10 bg-black/40 text-[#e8edf4]"
                />
                <Button disabled={creatingWs}>{creatingWs ? '…' : 'Create'}</Button>
              </form>
            }
          />
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState title="No workspace selected" description="Pick or create a workspace to continue." />
      </div>
    );
  }

  const activeConfig = configs.find((c) => c.provider === 'gemini') ?? configs[0];
  const composerLocked = busy || configs.length === 0 || Boolean(pendingAsk);
  const empty = bubbles.length === 0 && traces.length === 0;

  const headerEnd = (
    <>
      {activeConfig ? (
        <button
          type="button"
          onClick={() => setShowSetup((v) => !v)}
          className="rounded-control border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-[#8b95a8] hover:border-white/20 hover:text-[#c5cedc]"
        >
          {activeConfig.provider} · {activeConfig.model}
        </button>
      ) : (
        <span className="rounded-control border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
          Add AI key
        </span>
      )}
      <Button
        variant="secondary"
        className="border-white/10 bg-white/[0.04] text-[#e8edf4] lg:hidden"
        onClick={startNew}
      >
        New
      </Button>
    </>
  );

  return (
    <AgentSurfaceShell flush headerEnd={headerEnd}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-56 shrink-0 lg:block xl:w-60">
          <AgentSessionRail
            conversations={conversations}
            activeId={activeId}
            onSelect={selectConversation}
            onNew={startNew}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-3xl space-y-6">
              {showSetup ? (
                <div className="rounded-2xl border border-white/[0.08] bg-black/35 p-4 backdrop-blur-md">
                  <AgentAiSetupCard
                    workspaceId={current.id}
                    onSaved={() => {
                      setShowSetup(false);
                      void loadMeta();
                    }}
                  />
                </div>
              ) : null}

              {empty ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="py-10 sm:py-16"
                >
                  <p className="font-mono text-[12px] text-[#1FD1A0]">Ask in plain language</p>
                  <BlurText
                    text="Connect a database. Ship a dashboard."
                    className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#e8edf4] sm:text-4xl"
                    animateBy="words"
                    delay={40}
                  />
                  <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#8b95a8]">
                    The agent inspects schema and samples, asks when meaning is unclear, then builds
                    safe SELECT queries and live charts.
                  </p>
                  <div className="mt-8 flex flex-col gap-2">
                    {STARTER_PROMPTS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => void sendMessage(item)}
                        disabled={busy || configs.length === 0}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left text-sm text-[#a7b0c0] transition hover:border-[#1FD1A0]/35 hover:bg-white/[0.05] hover:text-[#e8edf4] disabled:opacity-40"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              <AgentStream
                bubbles={bubbles}
                traces={traces}
                status={status}
                askSlot={
                  pendingAsk ? (
                    <AgentAskCard
                      ask={pendingAsk}
                      disabled={busy}
                      onSubmit={(ids, freeText) => void submitAsk(ids, freeText)}
                    />
                  ) : null
                }
              />
              <InlineError>{error}</InlineError>
            </div>
          </div>

          <form onSubmit={onSubmit} className="px-4 pb-4 sm:px-8 sm:pb-6">
            <div className="mx-auto max-w-3xl">
              <div className="flex gap-2 rounded-2xl border border-white/[0.1] bg-black/45 p-2 shadow-[0_24px_80px_-40px_rgba(31,209,160,0.55)] backdrop-blur-xl">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    configs.length === 0
                      ? 'Add an AI provider key first…'
                      : pendingAsk
                        ? 'Answer the clarification above…'
                        : 'Ask AutoBI…'
                  }
                  disabled={composerLocked}
                  aria-label="Message Agent"
                  className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2.5 text-sm text-[#e8edf4] outline-none placeholder:text-[#6f7a8d] disabled:opacity-50"
                />
                {busy ? (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[#a7b0c0] hover:bg-white/[0.05]"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!prompt.trim() || composerLocked}
                    className="rounded-xl bg-[#1FD1A0] px-4 py-2 text-sm font-medium text-[#04140f] transition hover:bg-[#3ae0b0] disabled:opacity-40"
                  >
                    Send
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        <AnimatePresence>
          {dashboardId ? (
            <div className="hidden w-[42%] max-w-2xl shrink-0 border-l border-white/[0.06] xl:block">
              <AgentLiveCanvas
                dashboardId={dashboardId}
                onClose={() => setDashboardId(null)}
              />
            </div>
          ) : null}
        </AnimatePresence>
      </div>
    </AgentSurfaceShell>
  );
}
