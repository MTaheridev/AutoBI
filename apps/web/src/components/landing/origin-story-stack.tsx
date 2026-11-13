'use client';

import { useRef, type CSSProperties } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { originIncidents } from '@/components/landing/landing-data';

export function OriginStoryStack() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('.story-stack__card');
        const last = cards[cards.length - 1];
        if (!last) return;

        cards.forEach((card, index) => {
          if (index === cards.length - 1) return;
          const depth = cards.length - 1 - index;
          const inner = card.querySelector<HTMLElement>('.story-stack__inner');
          const shade = card.querySelector<HTMLElement>('.story-stack__shade');
          if (!inner || !shade) return;

          gsap
            .timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: cards[index + 1],
                start: 'top bottom',
                endTrigger: last,
                end: () => `top ${parseFloat(getComputedStyle(last).top) || 80}px`,
                scrub: true,
                invalidateOnRefresh: true,
              },
            })
            .to(inner, { scale: 1 - depth * 0.032 }, 0)
            .to(shade, { opacity: Math.min(0.16 * depth, 0.48) }, 0);
        });
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.story-stack__inner', { scale: 1 });
        gsap.set('.story-stack__shade', { opacity: 0 });
      });
    },
    { scope: root },
  );

  return (
    <section
      id="story"
      ref={root}
      className="relative border-t border-white/[0.08] bg-[#06080c] px-6 py-24 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="data-mono text-[11px] uppercase tracking-[0.18em] text-[#7CFFB2]/80">
            Origin Story · Why AutoBI Exists
          </p>
          <h2
            data-section-title
            className="mt-3 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl"
          >
            Built by a software engineer who got tired of the BI gatekeeper.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
            Every company has seen this movie: you write the code that powers the business, yet
            getting one chart from your own database means begging an empire-building manager who
            treats SQL like state secrets. Here is the four-part log that sparked AutoBI.
          </p>
        </div>

        <div className="story-stack mt-14">
          {originIncidents.map((item, i) => {
            const isFinal = i === originIncidents.length - 1;
            return (
              <article
                key={item.id}
                className="story-stack__card"
                style={{ '--i': i } as CSSProperties}
              >
                <div
                  className={[
                    'story-stack__inner rounded-panel border p-6 shadow-soft md:p-10',
                    isFinal
                      ? 'border-[#1FD1A0]/35 bg-gradient-to-br from-[#0d1d19] via-[#0c141d] to-[#0b101b]'
                      : 'border-white/[0.1] bg-[#0c1219]',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                    <span className="data-mono text-[11px] uppercase tracking-[0.16em] text-[#7CFFB2]">
                      {item.incident}
                    </span>
                    <span className="rounded-control border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 data-mono text-[11px] text-white/65">
                      {item.badge}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
                    <div>
                      <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                        {item.title}
                      </h3>
                      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
                        {item.story}
                      </p>
                    </div>

                    <div className="rounded-control border border-white/[0.08] bg-[#070a0f]/80 p-4">
                      <p className="data-mono text-[10px] uppercase tracking-[0.14em] text-red-300/80">
                        {item.symptom}
                      </p>
                      <div className="my-3 h-px bg-white/[0.08]" />
                      <p className="data-mono text-[11px] leading-relaxed text-[#7CFFB2]">
                        {item.antidote}
                      </p>
                    </div>
                  </div>

                  <div className="story-stack__shade" aria-hidden="true" />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
