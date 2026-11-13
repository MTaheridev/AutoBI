'use client';

import { useRef } from 'react';
import { DUR, EASE, STAGGER, ScrollTrigger, gsap, useGSAP } from '@/lib/gsap';
import { bottleneckToFeature } from '@/components/landing/landing-data';

export function PainToFeature() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const rows = gsap.utils.toArray<HTMLElement>('[data-bridge-row]');
        gsap.set(rows, { autoAlpha: 0, y: 32 });
        ScrollTrigger.batch(rows, {
          start: 'top 86%',
          once: true,
          interval: 0.08,
          batchMax: 2,
          onEnter: (batch) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: DUR.base,
              ease: EASE.out,
              stagger: STAGGER.base,
              overwrite: true,
            }),
        });

        const arrows = gsap.utils.toArray<SVGPathElement>('[data-bridge-arrow]');
        arrows.forEach((arrow) => {
          gsap.set(arrow, { strokeDasharray: 1, strokeDashoffset: 1 });
          gsap.to(arrow, {
            strokeDashoffset: 0,
            duration: 0.75,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: arrow,
              start: 'top 85%',
              once: true,
            },
          });
        });
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-bridge-row]', { autoAlpha: 1, y: 0 });
        gsap.set('[data-bridge-arrow]', { strokeDashoffset: 0 });
      });
    },
    { scope: root },
  );

  return (
    <section
      id="story-map"
      ref={root}
      className="relative border-t border-white/[0.08] bg-[#070a0f] px-6 py-24 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="data-mono text-[11px] uppercase tracking-[0.18em] text-[#7CFFB2]/80">
            Pain → Architecture Matrix
          </p>
          <h2
            data-section-title
            className="mt-3 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl"
          >
            Every feature in AutoBI exists to bury one excuse from that story.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
            Nothing here is checkbox bloat. Each monorepo package maps 1-to-1 to a real bottleneck I
            hit on the job.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {bottleneckToFeature.map((row) => (
            <div
              key={row.id}
              data-bridge-row
              className="grid items-center gap-4 rounded-panel border border-white/[0.09] bg-[#0c1219] p-5 md:p-6 lg:grid-cols-[1fr_72px_1.15fr]"
            >
              <div className="rounded-control border border-white/[0.07] bg-[#080b10] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="data-mono text-[10px] uppercase tracking-[0.15em] text-white/45">
                    {row.chapter}
                  </span>
                  <span className="data-mono text-[10px] text-red-300/75">{row.painMeta}</span>
                </div>
                <p className="mt-2 font-display text-lg font-semibold leading-snug text-white/85">
                  {row.painTitle}
                </p>
              </div>

              <div className="hidden items-center justify-center lg:flex" aria-hidden="true">
                <svg viewBox="0 0 64 24" className="h-6 w-16">
                  <path
                    data-bridge-arrow
                    pathLength={1}
                    d="M2 12 H56 M48 5 L58 12 L48 19"
                    fill="none"
                    stroke="#1FD1A0"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <span className="inline-flex rounded-control border border-[#1FD1A0]/30 bg-[#0F6E56]/20 px-2.5 py-0.5 data-mono text-[11px] text-[#7CFFB2]">
                  {row.engineName}
                </span>
                <h3 className="mt-2.5 font-display text-xl font-semibold tracking-tight text-white">
                  {row.featureTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{row.featureBody}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
