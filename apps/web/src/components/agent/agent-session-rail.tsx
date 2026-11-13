'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AgentConversationSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
  preview: string | null;
};

export function AgentSessionRail({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: AgentConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-r border-white/[0.06] bg-black/25 backdrop-blur-md">
      <div className="border-b border-white/[0.06] p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-control bg-[#1FD1A0] px-3 py-2.5 text-sm font-medium text-[#04140f] transition hover:bg-[#3ae0b0] motion-safe:active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New chat
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-[#8b95a8]">
            Sessions land here after you ask.
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    'w-full rounded-control px-2.5 py-2.5 text-left transition',
                    activeId === c.id
                      ? 'bg-white/[0.08] text-[#e8edf4] ring-1 ring-[#1FD1A0]/35'
                      : 'text-[#a7b0c0] hover:bg-white/[0.04] hover:text-[#e8edf4]',
                  )}
                >
                  <div className="truncate text-sm font-medium">{c.title || 'Untitled'}</div>
                  {c.preview ? (
                    <div className="mt-0.5 truncate text-[11px] text-[#6f7a8d]">{c.preview}</div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
