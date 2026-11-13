'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { DUR, EASE, gsap, useGSAP } from '@/lib/gsap';

const GradientASCII = dynamic(() => import('@/components/bits/GradientASCII'), { ssr: false });

/** Match landing dark instrument tokens so shared Input/Button/Label stay legible. */
const darkFormTokens = {
  '--surface': '#0e1218',
  '--surface-muted': '#161c26',
  '--surface-elevated': '#141a24',
  '--ink': '#e8edf4',
  '--ink-muted': '#939cb0',
  '--line': '#2a3342',
  '--signal': '#2bb08a',
  '--signal-soft': '#14352c',
  '--signal-ink': '#06150f',
  color: '#e8edf4',
} as CSSProperties;

export function AuthFrame({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('landing-scroll', 'js');
    return () => document.documentElement.classList.remove('landing-scroll', 'js');
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: EASE.out } });
        tl.from('[data-auth-brand]', { autoAlpha: 0, y: 16, duration: DUR.fast })
          .from('[data-auth-title]', { autoAlpha: 0, y: 18, duration: DUR.base }, '-=0.15')
          .from('[data-auth-desc]', { autoAlpha: 0, y: 12, duration: DUR.base }, '-=0.35')
          .from(panel.current, { autoAlpha: 0, y: 28, duration: DUR.base + 0.1 }, '-=0.4')
          .from('[data-auth-footer]', { autoAlpha: 0, y: 10, duration: DUR.fast }, '-=0.35');
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-auth-brand], [data-auth-title], [data-auth-desc], [data-auth-footer]', {
          autoAlpha: 1,
          y: 0,
        });
        if (panel.current) gsap.set(panel.current, { autoAlpha: 1, y: 0 });
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06080c] px-6 py-12"
      style={darkFormTokens}
    >
      <div
        className="absolute inset-0 z-0"
        style={{ width: '100%', height: '100vh' }}
        aria-hidden
      >
        <GradientASCII
          colors={['#0F6E56', '#1FD1A0', '#3A5BFF', '#7CFFB2']}
          shape="horizon"
          cellSize={16}
          density={0.8}
          glyphOpacity={0.85}
          glow={0.3}
          speed={0.55}
          gradientOpacity={0.75}
          mouseInteraction
          clickEffect="wave"
          intro
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_5%,rgba(6,8,12,0.45)_50%,rgba(6,8,12,0.88)_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center sm:text-left">
          <Link href="/" data-auth-brand className="inline-flex flex-col gap-2">
            <span className="font-display text-3xl font-semibold tracking-tight text-white">
              AutoBI
            </span>
            <span className="inline-flex w-fit rounded-control border border-white/[0.12] bg-black/25 px-2.5 py-1 data-mono text-[10px] uppercase tracking-[0.16em] text-[#7CFFB2]/90">
              Self-hosted · Governed BI
            </span>
          </Link>
          <h1
            data-auth-title
            className="mt-6 font-display text-2xl font-semibold tracking-tight text-white md:text-3xl"
          >
            {title}
          </h1>
          {description ? (
            <p data-auth-desc className="mt-2 text-sm leading-relaxed text-white/65">
              {description}
            </p>
          ) : null}
        </div>

        <div
          ref={panel}
          className="rounded-panel border border-white/[0.1] bg-[#0c1219]/92 p-7 shadow-soft backdrop-blur-md sm:p-8"
        >
          <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-3">
            <span className="data-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
              Instrument console
            </span>
            <span className="inline-flex items-center gap-1.5 data-mono text-[11px] text-[#7CFFB2]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1FD1A0]" aria-hidden />
              Secure session
            </span>
          </div>
          {children}
        </div>

        {footer ? (
          <div
            data-auth-footer
            className="mt-6 text-center text-sm text-white/65 [&_a]:font-medium [&_a]:text-[#7CFFB2] [&_a]:no-underline hover:[&_a]:underline"
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
