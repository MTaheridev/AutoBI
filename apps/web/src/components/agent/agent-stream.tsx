'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';

export type TraceStep = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'running' | 'ok' | 'error';
  latencyMs?: number;
  result?: unknown;
  error?: string;
};

export type ChatBubble = {
  id: string;
  role: 'user' | 'assistant' | 'status';
  content: string;
};

function ToolTraceCard({ step }: { step: TraceStep }) {
  const [open, setOpen] = useState(step.status === 'error');
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-control border border-white/[0.08] bg-black/30"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              step.status === 'running' && 'animate-pulse bg-amber-400',
              step.status === 'ok' && 'bg-[#1FD1A0]',
              step.status === 'error' && 'bg-red-500',
            )}
          />
          <span className="truncate font-mono text-[12px] text-[#c5cedc]">{step.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {step.latencyMs != null ? (
            <span className="font-mono text-[11px] text-[#6f7a8d]">{step.latencyMs}ms</span>
          ) : null}
          <Badge
            tone={
              step.status === 'ok' ? 'success' : step.status === 'error' ? 'danger' : 'warning'
            }
          >
            {step.status}
          </Badge>
        </div>
      </button>
      <div className={cn('accordion-body', open && 'data-open')} data-open={open ? 'true' : 'false'}>
        <div className="accordion-body__inner">
          <div className="space-y-2 border-t border-white/[0.06] px-3 py-2 text-xs">
            <pre className="overflow-x-auto rounded-control bg-black/40 p-2 font-mono text-[11px] text-[#8b95a8]">
              {JSON.stringify(step.arguments, null, 2)}
            </pre>
            {step.error ? <p className="text-red-400">{step.error}</p> : null}
            {step.result != null ? (
              <pre className="max-h-48 overflow-auto rounded-control bg-black/40 p-2 font-mono text-[11px] text-[#8b95a8]">
                {JSON.stringify(step.result, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AgentStream({
  bubbles,
  traces,
  status,
  askSlot,
}: {
  bubbles: ChatBubble[];
  traces: TraceStep[];
  status?: string | null;
  askSlot?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {bubbles.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              b.role === 'user' &&
                'ml-auto bg-[#1FD1A0] text-[#04140f] shadow-[0_12px_40px_-18px_rgba(31,209,160,0.55)]',
              b.role === 'assistant' &&
                'border border-white/[0.08] bg-white/[0.04] text-[#e8edf4] backdrop-blur-sm',
              b.role === 'status' && 'border border-dashed border-white/10 bg-transparent text-[#8b95a8]',
            )}
          >
            {b.content}
          </motion.div>
        ))}
      </AnimatePresence>

      {askSlot}

      {traces.length ? (
        <div className="space-y-2">
          <p className="font-mono text-[11px] tracking-wide text-[#6f7a8d]">Tool trace</p>
          <div className="space-y-2">
            {traces.map((step) => (
              <ToolTraceCard key={step.id} step={step} />
            ))}
          </div>
        </div>
      ) : null}

      {status ? (
        <p className="font-mono text-xs text-[#8b95a8]" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
