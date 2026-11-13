'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { roiComparison, technicalFaq } from '@/components/landing/landing-data';

export function RoiAndFaq() {
  const [openId, setOpenId] = useState<string | null>(technicalFaq[0].id);

  return (
    <section
      id="ledger"
      className="relative border-t border-white/[0.08] bg-[#070a0f] px-6 py-24 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="data-mono text-[11px] uppercase tracking-[0.18em] text-[#7CFFB2]/80">
            The Gatekeeper Tax vs. AutoBI
          </p>
          <h2
            data-section-title
            className="mt-3 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl"
          >
            Stop funding bottlenecks. Start funding answers.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
            When analytics is held hostage by ego or ticket queues, you pay twice: once in salary
            and SaaS seats, and again in missed product decisions.
          </p>
        </div>

        <div
          data-reveal
          className="mt-12 overflow-hidden rounded-panel border border-white/[0.1] bg-[#0c1219]"
        >
          <div className="hidden grid-cols-12 border-b border-white/[0.08] bg-[#090d13] px-6 py-3.5 data-mono text-[11px] uppercase tracking-[0.14em] text-white/50 md:grid">
            <span className="col-span-3">Dimension</span>
            <span className="col-span-4 text-red-300/80">Gatekeeper BI Dept</span>
            <span className="col-span-5 text-[#7CFFB2]">AutoBI Self-Hosted</span>
          </div>

          <div className="divide-y divide-white/[0.08]">
            {roiComparison.map((row) => (
              <div
                key={row.dimension}
                className="grid gap-3 px-5 py-4 md:grid-cols-12 md:items-center md:gap-4 md:px-6"
              >
                <div className="font-display text-base font-semibold text-white md:col-span-3">
                  {row.dimension}
                </div>
                <div className="text-sm text-white/50 md:col-span-4">{row.oldWay}</div>
                <div className="rounded-control border border-[#1FD1A0]/20 bg-[#0F6E56]/15 px-3.5 py-2 text-sm text-[#CFF9E2] md:col-span-5">
                  {row.autobiWay}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="data-mono text-[11px] uppercase tracking-[0.18em] text-[#7CFFB2]/80">
              Engineering Guardrails
            </p>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white md:text-4xl">
              Questions every staff engineer asks first.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Speed means nothing if an LLM drops a table or leaks a connection string. AutoBI
              enforces strict compile-time and runtime boundaries.
            </p>
          </div>

          <div className="space-y-3">
            {technicalFaq.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-panel border border-white/[0.1] bg-[#0c1219]"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-display text-base font-semibold text-white md:text-lg">
                      {item.question}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className={[
                        'h-4 w-4 shrink-0 text-[#7CFFB2] transition-transform duration-200',
                        isOpen ? 'rotate-180' : 'rotate-0',
                      ].join(' ')}
                    />
                  </button>
                  <div className="accordion-body" data-open={isOpen ? 'true' : 'false'}>
                    <div className="accordion-body__inner">
                      <p className="border-t border-white/[0.07] px-5 py-4 text-sm leading-relaxed text-white/65">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
