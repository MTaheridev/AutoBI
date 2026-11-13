'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { widgetPresets } from '@/components/landing/landing-data';

export function WidgetPlayground() {
  const [selectedId, setSelectedId] = useState(widgetPresets[0].id);
  const [showSql, setShowSql] = useState(false);
  const preset = widgetPresets.find((p) => p.id === selectedId) ?? widgetPresets[0];

  return (
    <section
      id="playground"
      className="relative border-t border-white/[0.08] bg-[#06080c] px-6 py-24 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="data-mono text-[11px] uppercase tracking-[0.18em] text-[#7CFFB2]/80">
              Interactive Studio · Zero Ticket Queue
            </p>
            <h2
              data-section-title
              className="mt-3 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl"
            >
              Ask a question. Watch the spec compile.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/65 md:text-base">
              Switch between three real prompts below to see how AutoBI turns approved semantics
              into dialect SQL and a live 12-column widget grid.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Prompt scenarios"
            className="inline-flex flex-wrap gap-1.5 rounded-panel border border-white/[0.1] bg-[#0c1219] p-1.5"
          >
            {widgetPresets.map((item) => {
              const active = item.id === preset.id;
              return (
                <button
                  key={item.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setSelectedId(item.id)}
                  className={[
                    'relative rounded-control px-3.5 py-2 data-mono text-xs transition-colors',
                    active ? 'text-[#06150f]' : 'text-white/65 hover:text-white',
                  ].join(' ')}
                >
                  {active && (
                    <motion.span
                      layoutId="playground-pill"
                      transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                      className="absolute inset-0 rounded-control bg-[#1FD1A0]"
                    />
                  )}
                  <span className="relative z-10 font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-panel border border-white/[0.1] bg-[#0c1219] shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#090d13] px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#1FD1A0]" aria-hidden />
              <span className="data-mono text-xs text-white/85">Prompt: “{preset.prompt}”</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-control border border-white/[0.1] px-2.5 py-1 data-mono text-[11px] text-white/60">
                {preset.dialect}
              </span>
              <span className="rounded-control border border-[#1FD1A0]/30 bg-[#0F6E56]/20 px-2.5 py-1 data-mono text-[11px] text-[#7CFFB2]">
                Compiled · {preset.compileMs}
              </span>
              <span className="rounded-control border border-white/[0.1] px-2.5 py-1 data-mono text-[11px] text-white/60">
                {preset.version}
              </span>
              <button
                type="button"
                onClick={() => setShowSql((v) => !v)}
                className="rounded-control border border-white/[0.14] bg-white/[0.04] px-2.5 py-1 data-mono text-[11px] text-white/80 hover:bg-white/[0.09]"
              >
                {showSql ? 'Hide SQL' : 'Inspect SQL'}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={preset.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="p-5 md:p-7"
            >
              <div className="grid gap-4 md:grid-cols-3">
                {preset.kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-control border border-white/[0.08] bg-[#080b10] p-4"
                  >
                    <p className="data-mono text-[11px] uppercase tracking-[0.12em] text-white/50">
                      {kpi.label}
                    </p>
                    <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                      {kpi.value}
                    </p>
                    <p className="mt-1.5 data-mono text-[11px] text-[#7CFFB2]">{kpi.delta}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-12">
                <div className="rounded-control border border-white/[0.08] bg-[#080b10] p-5 lg:col-span-8">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-semibold text-white">
                      {preset.chartTitle}
                    </span>
                    <span className="data-mono text-[11px] text-white/45">widget: bar · w:8 h:4</span>
                  </div>

                  <div className="mt-5 space-y-3.5">
                    {preset.bars.map((bar, idx) => (
                      <div key={bar.label} className="space-y-1.5">
                        <div className="flex items-center justify-between data-mono text-xs">
                          <span className="text-white/75">{bar.label}</span>
                          <span className="text-[#7CFFB2]">{bar.display}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: bar.value / 100 }}
                            transition={{
                              duration: 0.45,
                              delay: idx * 0.05,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            style={{ transformOrigin: '0% 50%' }}
                            className="h-full w-full rounded-full bg-gradient-to-r from-[#0F6E56] via-[#1FD1A0] to-[#3A5BFF]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-control border border-white/[0.08] bg-[#080b10] p-5 lg:col-span-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-semibold text-white">
                      {preset.donutLabel}
                    </span>
                    <span className="data-mono text-[11px] text-white/45">widget: donut</span>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {preset.donutSplit.map((seg, i) => {
                      const swatches = ['bg-[#1FD1A0]', 'bg-[#3A5BFF]', 'bg-[#0F6E56]'];
                      return (
                        <li
                          key={seg.name}
                          className="flex items-center justify-between rounded-control border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                        >
                          <span className="inline-flex items-center gap-2 text-sm text-white/80">
                            <span
                              className={['h-2.5 w-2.5 rounded-full', swatches[i % swatches.length]].join(
                                ' ',
                              )}
                              aria-hidden
                            />
                            {seg.name}
                          </span>
                          <span className="data-mono text-xs text-[#7CFFB2]">{seg.pct}%</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="accordion-body mt-4" data-open={showSql ? 'true' : 'false'}>
                <div className="accordion-body__inner">
                  <pre className="data-mono overflow-x-auto rounded-control border border-white/[0.08] bg-[#05070b] p-4 text-xs leading-relaxed text-[#9EE7C7]">
                    {preset.sql}
                  </pre>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
