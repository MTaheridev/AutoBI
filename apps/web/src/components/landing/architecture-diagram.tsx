'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy } from 'lucide-react';
import { gsap, useGSAP } from '@/lib/gsap';
import {
  architectureInvariants,
  architectureNodes,
  cliTabs,
} from '@/components/landing/landing-data';

export function ArchitectureDiagram() {
  const root = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<(typeof cliTabs)[number]['id']>(cliTabs[0].id);
  const [copied, setCopied] = useState(false);
  const active = cliTabs.find((t) => t.id === tab) ?? cliTabs[0];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const paths = gsap.utils.toArray<SVGPathElement>('[data-arch-line]');
        paths.forEach((path) => {
          gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
        });
        gsap.to(paths, {
          strokeDashoffset: 0,
          duration: 1.1,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 70%',
            once: true,
          },
        });

        const nodes = gsap.utils.toArray<HTMLElement>('[data-arch-node]');
        gsap.from(nodes, {
          autoAlpha: 0,
          y: 18,
          duration: 0.7,
          stagger: 0.06,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 72%',
            once: true,
          },
        });
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-arch-line]', { strokeDashoffset: 0 });
        gsap.set('[data-arch-node]', { autoAlpha: 1, y: 0 });
      });
    },
    { scope: root },
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      id="architecture"
      ref={root}
      className="relative border-t border-white/[0.08] bg-[#06080c] px-6 py-24 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <p className="data-mono text-[11px] uppercase tracking-[0.18em] text-[#7CFFB2]/80">
          How it runs
        </p>
        <h2
          data-section-title
          className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-white md:text-5xl"
        >
          Modular monolith. Hard trust boundaries.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
          Web, API, and worker share packages — connectors and AI stay isolated from secrets and
          Nest.
        </p>

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="rounded-panel border border-white/[0.1] bg-[#0c1219] p-4 md:p-6">
            <svg
              viewBox="0 0 560 320"
              className="h-auto w-full"
              role="img"
              aria-label="AutoBI runtime architecture diagram"
            >
              <defs>
                <linearGradient id="archStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0F6E56" />
                  <stop offset="55%" stopColor="#1FD1A0" />
                  <stop offset="100%" stopColor="#3A5BFF" />
                </linearGradient>
              </defs>

              <path
                data-arch-line
                pathLength={1}
                d="M90 70 H210"
                fill="none"
                stroke="url(#archStroke)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                data-arch-line
                pathLength={1}
                d="M350 70 H470"
                fill="none"
                stroke="url(#archStroke)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                data-arch-line
                pathLength={1}
                d="M280 110 V150"
                fill="none"
                stroke="url(#archStroke)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                data-arch-line
                pathLength={1}
                d="M210 190 H120 V240"
                fill="none"
                stroke="url(#archStroke)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                data-arch-line
                pathLength={1}
                d="M350 190 H440 V240"
                fill="none"
                stroke="url(#archStroke)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                data-arch-line
                pathLength={1}
                d="M280 230 V270"
                fill="none"
                stroke="url(#archStroke)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {[
                { x: 20, y: 40, w: 140, label: architectureNodes[0].label, sub: architectureNodes[0].detail },
                { x: 210, y: 40, w: 140, label: architectureNodes[1].label, sub: architectureNodes[1].detail },
                { x: 400, y: 40, w: 140, label: architectureNodes[2].label, sub: architectureNodes[2].detail },
                { x: 140, y: 160, w: 140, label: architectureNodes[3].label, sub: architectureNodes[3].detail },
                { x: 280, y: 160, w: 140, label: architectureNodes[4].label, sub: architectureNodes[4].detail },
                { x: 50, y: 250, w: 160, label: architectureNodes[5].label, sub: architectureNodes[5].detail },
                { x: 350, y: 250, w: 160, label: architectureNodes[6].label, sub: architectureNodes[6].detail },
              ].map((node) => (
                <g key={node.label} data-arch-node>
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.w}
                    height={52}
                    rx="8"
                    fill="#111821"
                    stroke="rgba(255,255,255,0.12)"
                  />
                  <text
                    x={node.x + 14}
                    y={node.y + 22}
                    fill="#E8EDF4"
                    style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}
                  >
                    {node.label}
                  </text>
                  <text
                    x={node.x + 14}
                    y={node.y + 40}
                    fill="rgba(232,237,244,0.55)"
                    style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}
                  >
                    {node.sub}
                  </text>
                </g>
              ))}
            </svg>

            <ul className="mt-5 space-y-2 border-t border-white/[0.08] pt-4">
              {architectureInvariants.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-white/65">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1FD1A0]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div id="quickstart" className="rounded-panel border border-white/[0.1] bg-[#0c1219]">
            <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.08] p-2">
              {cliTabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={[
                    'rounded-control px-3 py-1.5 data-mono text-[11px] transition-colors',
                    item.id === tab
                      ? 'bg-signal-soft text-[#7CFFB2]'
                      : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void copy()}
                className="ml-auto inline-flex items-center gap-1.5 rounded-control border border-white/[0.1] px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/[0.04] hover:text-white"
                aria-label={copied ? 'Copied' : 'Copy commands'}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {copied ? (
                    <motion.span
                      key="ok"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-1 text-[#7CFFB2]"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Copied
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-1"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      Copy
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <pre className="data-mono overflow-x-auto p-4 text-[12px] leading-relaxed text-[#9EE7C7] md:p-5 md:text-[13px]">
              {active.code}
            </pre>
            <p className="border-t border-white/[0.08] px-4 py-3 text-xs text-white/45 md:px-5">
              Requires Node ≥ 20, pnpm 9, and Docker for Postgres + Redis.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
