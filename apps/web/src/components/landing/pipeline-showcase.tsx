'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { pipelineStages, type PipelineStageId } from '@/components/landing/landing-data';

export function PipelineShowcase() {
  const root = useRef<HTMLElement>(null);
  const railFill = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState<PipelineStageId>(pipelineStages[0].id);
  const stage = pipelineStages.find((s) => s.id === active) ?? pipelineStages[0];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        pipelineStages.forEach((item) => {
          const el = root.current?.querySelector<HTMLElement>(`[data-stage="${item.id}"]`);
          if (!el) return;
          ScrollTrigger.create({
            trigger: el,
            start: 'top 55%',
            end: 'bottom 45%',
            onToggle: (self) => {
              if (self.isActive) setActive(item.id);
            },
          });
        });

        if (railFill.current) {
          gsap.fromTo(
            railFill.current,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: '[data-pipeline-list]',
                start: 'top 65%',
                end: 'bottom 50%',
                scrub: true,
              },
            },
          );
        }

        gsap.from('[data-pipeline-console]', {
          y: 44,
          autoAlpha: 0,
          duration: 0.95,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 72%',
            once: true,
          },
        });
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        if (railFill.current) gsap.set(railFill.current, { scaleY: 1 });
        gsap.set('[data-pipeline-console]', { autoAlpha: 1, y: 0 });
      });
    },
    { scope: root },
  );

  return (
    <section
      id="pipeline"
      ref={root}
      className="relative border-t border-white/[0.08] bg-[#070a0f] px-6 py-24 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <p className="data-mono text-[11px] uppercase tracking-[0.18em] text-[#7CFFB2]/80">
          Live Engine Walkthrough
        </p>
        <h2
          data-section-title
          className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-white md:text-5xl"
        >
          How a question becomes a dashboard
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">
          Four governed stages — from encrypted schema introspection to versioned ECharts specs.
        </p>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
          <div className="relative pl-6" data-pipeline-list>
            <span
              className="pointer-events-none absolute bottom-2 left-0 top-2 w-px bg-white/[0.08]"
              aria-hidden
            />
            <span
              ref={railFill}
              className="pipeline-rail-fill pointer-events-none absolute bottom-2 left-0 top-2 w-px bg-gradient-to-b from-[#0F6E56] via-[#1FD1A0] to-[#3A5BFF]"
              aria-hidden
            />

            <ol className="space-y-10 md:space-y-16">
              {pipelineStages.map((item) => {
                const isActive = item.id === active;
                return (
                  <li
                    key={item.id}
                    data-stage={item.id}
                    className="border-t border-white/[0.08] pt-6"
                  >
                    <div className="data-mono text-[11px] text-[#7CFFB2]/80">{item.step}</div>
                    <h3
                      className={[
                        'mt-2 font-display text-2xl font-semibold tracking-tight transition-opacity duration-200',
                        isActive ? 'text-white opacity-100' : 'text-white opacity-45',
                      ].join(' ')}
                    >
                      {item.title}
                    </h3>
                    <p
                      className={[
                        'mt-3 max-w-md text-sm leading-relaxed transition-opacity duration-200',
                        isActive ? 'text-white/75 opacity-100' : 'text-white/65 opacity-45',
                      ].join(' ')}
                    >
                      {item.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div
              data-pipeline-console
              className="overflow-hidden rounded-panel border border-white/[0.1] bg-[#0c1219] shadow-soft"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#090d13] px-4 py-3">
                <span className="data-mono text-[11px] uppercase tracking-[0.14em] text-white/50">
                  Instrument console
                </span>
                <span className="data-mono text-[11px] text-[#7CFFB2]">{stage.artifactLabel}</span>
              </div>
              <div className="relative min-h-[280px] p-4 md:min-h-[320px] md:p-5">
                <AnimatePresence mode="wait">
                  <motion.pre
                    key={stage.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="data-mono overflow-x-auto whitespace-pre text-[12px] leading-relaxed text-[#9EE7C7] md:text-[13px]"
                  >
                    {stage.artifact}
                  </motion.pre>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
