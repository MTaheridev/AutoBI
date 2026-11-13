'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { AgentAskState } from '@/lib/agent-stream';

export function AgentAskCard({
  ask,
  disabled,
  onSubmit,
}: {
  ask: AgentAskState;
  disabled?: boolean;
  onSubmit: (selectedOptionIds: string[], freeText?: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [other, setOther] = useState('');

  function toggle(id: string) {
    if (ask.allowMultiple) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      return;
    }
    setSelected([id]);
  }

  function submit() {
    if (!selected.length && !other.trim()) return;
    onSubmit(selected, other.trim() || undefined);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#1FD1A0]/35 bg-[#0c1219]/90 p-4 shadow-[0_20px_60px_-30px_rgba(31,209,160,0.45)] backdrop-blur-md"
    >
      <p className="font-mono text-[11px] text-[#1FD1A0]">Needs your call</p>
      <p className="mt-2 text-sm font-medium text-[#e8edf4]">{ask.question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ask.options.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt.id)}
              className={cn(
                'rounded-control border px-3 py-1.5 text-left text-xs transition',
                active
                  ? 'border-[#1FD1A0] bg-[#1FD1A0]/15 text-[#e8edf4]'
                  : 'border-white/10 bg-white/[0.03] text-[#a7b0c0] hover:border-[#1FD1A0]/50 hover:text-[#e8edf4]',
                disabled && 'opacity-50',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Other (optional)…"
          disabled={disabled}
          aria-label="Other answer"
          className="w-full rounded-control border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#e8edf4] outline-none placeholder:text-[#6f7a8d] focus:border-[#1FD1A0]/50 focus:ring-2 focus:ring-[#1FD1A0]/20"
        />
        <button
          type="button"
          disabled={disabled || (!selected.length && !other.trim())}
          onClick={submit}
          className="rounded-control bg-[#1FD1A0] px-4 py-2 text-sm font-medium text-[#04140f] transition hover:bg-[#3ae0b0] disabled:opacity-50"
        >
          Continue
        </button>
      </div>
      {ask.allowMultiple ? (
        <p className="mt-2 text-[11px] text-[#6f7a8d]">Select all that apply.</p>
      ) : null}
    </motion.div>
  );
}
