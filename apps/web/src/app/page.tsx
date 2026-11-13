'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Github } from 'lucide-react';
import { Button } from '@/components/ui';
import { Magnetic } from '@/components/landing/magnetic';
import { SmoothScroll } from '@/components/landing/smooth-scroll';
import { OriginStoryStack } from '@/components/landing/origin-story-stack';
import { PainToFeature } from '@/components/landing/pain-to-feature';
import { PipelineShowcase } from '@/components/landing/pipeline-showcase';
import { WidgetPlayground } from '@/components/landing/widget-playground';
import { RoiAndFaq } from '@/components/landing/roi-and-faq';
import { ArchitectureDiagram } from '@/components/landing/architecture-diagram';
import {
  REPO_URL,
  PROFILE_URL,
  capabilities,
  creator,
  heroFacts,
  stackBadges,
} from '@/components/landing/landing-data';
import { DUR, EASE, STAGGER, SplitText, ScrollTrigger, gsap, useGSAP } from '@/lib/gsap';

const GradientASCII = dynamic(() => import('@/components/bits/GradientASCII'), { ssr: false });

export default function HomePage() {
  const page = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const manifesto = useRef<HTMLParagraphElement>(null);
  const wordmark = useRef<HTMLParagraphElement>(null);
  const spotRects = useRef<WeakMap<HTMLElement, DOMRect>>(new WeakMap());
  const spotRaf = useRef<number>(0);

  const onSpotlightEnter = (event: ReactPointerEvent<HTMLElement>) => {
    const el = event.currentTarget;
    spotRects.current.set(el, el.getBoundingClientRect());
  };

  const onSpotlightMove = (event: ReactPointerEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const clientX = event.clientX;
    const clientY = event.clientY;
    if (spotRaf.current) return;
    spotRaf.current = window.requestAnimationFrame(() => {
      spotRaf.current = 0;
      const rect = spotRects.current.get(el) ?? el.getBoundingClientRect();
      spotRects.current.set(el, rect);
      el.style.setProperty('--spot-x', `${clientX - rect.left}px`);
      el.style.setProperty('--spot-y', `${clientY - rect.top}px`);
    });
  };

  useEffect(() => {
    document.documentElement.classList.add('js', 'landing-scroll');
    return () => {
      if (spotRaf.current) window.cancelAnimationFrame(spotRaf.current);
      document.documentElement.classList.remove('js', 'landing-scroll');
    };
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (progress.current) {
          gsap.set(progress.current, { scaleX: 0 });
          ScrollTrigger.create({
            trigger: page.current,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
              gsap.set(progress.current, { scaleX: self.progress });
            },
          });
        }

        const tl = gsap.timeline({ defaults: { ease: EASE.out } });
        tl.from('[data-hero-eyebrow]', { autoAlpha: 0, y: 14, duration: DUR.fast })
          .from('[data-hero-lead]', { autoAlpha: 0, y: 18, duration: DUR.base }, '-=0.1')
          .from('[data-hero-cta]', { autoAlpha: 0, y: 16, duration: DUR.base }, '-=0.35')
          .from('[data-hero-ticker]', { autoAlpha: 0, y: 12, duration: DUR.base }, '-=0.4');

        if (headline.current) {
          SplitText.create(headline.current, {
            type: 'lines',
            mask: 'lines',
            linesClass: 'line',
            autoSplit: true,
            aria: 'auto',
            onSplit(self) {
              return gsap.from(self.lines, {
                yPercent: 110,
                duration: DUR.slow,
                ease: EASE.out,
                stagger: 0.09,
                delay: 0.12,
              });
            },
          });
        }

        gsap.to('[data-hero-stage]', {
          yPercent: 18,
          ease: 'none',
          scrollTrigger: {
            trigger: hero.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });

        gsap.to('[data-hero-content]', {
          y: 72,
          opacity: 0.35,
          ease: 'none',
          scrollTrigger: {
            trigger: hero.current,
            start: 'center top',
            end: 'bottom top',
            scrub: true,
          },
        });

        if (manifesto.current) {
          const target = manifesto.current.querySelector<HTMLElement>('[data-split]');
          if (target) {
            SplitText.create(target, {
              type: 'words',
              tag: 'span',
              aria: 'hidden',
              onSplit(self) {
                return gsap.fromTo(
                  self.words,
                  { opacity: 0.16 },
                  {
                    opacity: 1,
                    ease: 'none',
                    stagger: 0.08,
                    scrollTrigger: {
                      trigger: manifesto.current,
                      start: 'top 78%',
                      end: 'bottom 42%',
                      scrub: true,
                    },
                  },
                );
              },
            });
          }
        }

        gsap.utils.toArray<HTMLElement>('[data-section-title]').forEach((el) => {
          SplitText.create(el, {
            type: 'lines',
            mask: 'lines',
            linesClass: 'line',
            autoSplit: true,
            aria: 'auto',
            onSplit(self) {
              return gsap.from(self.lines, {
                yPercent: 110,
                duration: DUR.slow,
                ease: EASE.out,
                stagger: 0.08,
                scrollTrigger: { trigger: el, start: 'top 86%', once: true },
              });
            },
          });
        });

        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
          const speed = Number(el.dataset.speed || 0.2);
          gsap.to(el, {
            y: () => speed * 140,
            ease: 'none',
            scrollTrigger: {
              trigger: el.parentElement || el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });
        });

        const cards = gsap.utils.toArray<HTMLElement>('[data-reveal]');
        gsap.set(cards, { y: 44, rotateX: 3 });
        ScrollTrigger.batch(cards, {
          start: 'top 88%',
          once: true,
          interval: 0.1,
          batchMax: 3,
          onEnter: (batch) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              rotateX: 0,
              duration: DUR.base + 0.2,
              ease: EASE.out,
              stagger: STAGGER.base,
              overwrite: true,
            }),
        });

        if (wordmark.current) {
          gsap.fromTo(
            wordmark.current,
            { y: 56, opacity: 0.22, scale: 0.93 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: wordmark.current,
                start: 'top 92%',
                end: 'top 48%',
                scrub: true,
              },
            },
          );
        }

        const ticker = page.current?.querySelector<HTMLElement>('[data-marquee-track]');
        if (ticker) {
          const loop = gsap.to(ticker, {
            xPercent: -50,
            duration: 28,
            ease: 'none',
            repeat: -1,
          });
          ScrollTrigger.create({
            trigger: page.current,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
              const v = self.getVelocity();
              loop.timeScale(gsap.utils.clamp(0.6, 2.4, 1 + Math.abs(v) / 3000));
            },
          });
        }
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(
          '[data-reveal], [data-hero-eyebrow], [data-hero-lead], [data-hero-cta], [data-hero-ticker]',
          { autoAlpha: 1, y: 0, rotateX: 0 },
        );
        if (progress.current) gsap.set(progress.current, { scaleX: 0 });
      });
    },
    { scope: page },
  );

  return (
    <SmoothScroll>
      <div ref={page} className="dark landing-page min-h-screen bg-[#06080c] text-white">
        <div
          ref={progress}
          className="landing-progress pointer-events-none fixed inset-x-0 top-0 z-40 h-0.5 bg-gradient-to-r from-[#0F6E56] via-[#1FD1A0] to-[#3A5BFF]"
          aria-hidden
        />

        <section
          ref={hero}
          className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[#06080c]"
        >
          <div
            data-hero-stage
            className="absolute inset-0"
            style={{ width: '100%', height: '120vh' }}
            aria-hidden
          >
            <GradientASCII
              colors={['#0F6E56', '#1FD1A0', '#3A5BFF', '#7CFFB2']}
              shape="horizon"
              cellSize={16}
              density={0.85}
              glyphOpacity={0.9}
              glow={0.35}
              speed={0.7}
              gradientOpacity={0.85}
              mouseInteraction
              clickEffect="wave"
              intro
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(6,8,12,0.35)_50%,rgba(6,8,12,0.88)_100%)]" />
          </div>

          <div
            data-hero-content
            className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-14 pt-16 md:px-10 md:pb-20"
          >
            <p
              data-hero-eyebrow
              className="inline-flex rounded-control border border-white/[0.12] bg-black/25 px-3 py-1.5 data-mono text-[10px] uppercase tracking-[0.16em] text-[#7CFFB2]/90 backdrop-blur-sm"
            >
              Self-hosted AI BI · Built by an engineer to end BI gatekeeping
            </p>

            <h1
              ref={headline}
              className="mt-6 max-w-4xl font-display text-4xl font-semibold leading-[0.98] tracking-tight text-white md:text-6xl lg:text-7xl"
            >
              Ask in plain English. Ship governed dashboards without the gatekeeper.
            </h1>

            <p
              data-hero-lead
              className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg"
            >
              Connect Postgres, MySQL, MariaDB, or SQL Server. Let AI propose your semantic layer,
              approve definitions once as a team, and compile safe read-only SQL into live ECharts
              dashboards in seconds — not two-sprint Jira queues.
            </p>

            <div data-hero-cta className="mt-8 flex flex-wrap items-center gap-3">
              <Magnetic>
                <Link href="/register">
                  <Button className="bg-brand-500 hover:bg-brand-400">Start free</Button>
                </Link>
              </Magnetic>
              <Magnetic>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="secondary"
                    className="border-white/25 bg-white/10 text-white hover:bg-white/20"
                  >
                    <Github className="h-4 w-4" aria-hidden />
                    Explore on GitHub
                  </Button>
                </a>
              </Magnetic>
              <a
                href="#story"
                className="landing-nav-link ml-1 text-sm text-white/70 hover:text-white"
              >
                Read why I built it
              </a>
              <span className="text-white/25" aria-hidden>
                ·
              </span>
              <Link
                href="/login"
                className="landing-nav-link text-sm text-white/65 hover:text-white"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div
            data-hero-ticker
            className="relative z-10 overflow-hidden border-t border-white/[0.1] bg-black/20 py-4 backdrop-blur-sm"
          >
            <div
              data-marquee-track
              className="flex w-max gap-10 whitespace-nowrap px-6 data-mono text-[11px] text-white/45"
            >
              {[...heroFacts, ...heroFacts].map((fact, i) => (
                <span key={`${fact}-${i}`} className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#1FD1A0]" aria-hidden />
                  {fact}
                </span>
              ))}
            </div>
          </div>
        </section>

        <OriginStoryStack />

        <section className="relative border-t border-white/[0.08] bg-[#06080c] px-6 py-24 md:px-10">
          <div className="mx-auto max-w-4xl">
            <p className="data-mono text-[11px] uppercase tracking-[0.18em] text-[#7CFFB2]/80">
              The Engineering Thesis
            </p>
            <p
              ref={manifesto}
              className="mt-4 font-display text-2xl font-semibold leading-snug tracking-tight text-white md:text-4xl"
            >
              <span className="sr-only">
                Stop paying gatekeepers to guard your own tables. AI proposes meaning, your team
                approves the math, and deterministic compilers validate every query before it touches
                production data.
              </span>
              <span aria-hidden data-split>
                Stop paying gatekeepers to guard your own tables. AI proposes meaning, your team
                approves the math, and deterministic compilers validate every query before it touches
                production data.
              </span>
            </p>
          </div>
        </section>

        <PainToFeature />

        <section
          id="capabilities"
          className="relative border-t border-white/[0.08] bg-[#06080c] px-6 py-24 md:px-10"
        >
          <div
            data-parallax
            data-speed="0.16"
            className="ambient-orb ambient-orb--teal -left-24 top-12 h-[420px] w-[420px]"
            aria-hidden
          />
          <div
            data-parallax
            data-speed="-0.12"
            className="ambient-orb ambient-orb--blue -right-24 bottom-8 h-[460px] w-[460px]"
            aria-hidden
          />

          <div className="relative mx-auto max-w-6xl">
            <p className="data-mono text-[11px] uppercase tracking-[0.18em] text-[#7CFFB2]/80">
              Capabilities Deep Dive
            </p>
            <h2
              data-section-title
              className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-white md:text-5xl"
            >
              Six production subsystems. Zero hand-waving.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">
              Connect, name, ask, and see — engineered with strict TypeScript contracts from database
              socket to ECharts canvas.
            </p>

            <div className="mt-12 grid gap-4 [perspective:1200px] md:grid-cols-12">
              {capabilities.map((card) => (
                <article
                  key={card.id}
                  data-reveal
                  onPointerEnter={onSpotlightEnter}
                  onPointerMove={onSpotlightMove}
                  className={[
                    'spotlight-card rounded-panel border border-white/[0.1] bg-[#0c1219] p-5 md:p-6',
                    card.span,
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-xl font-semibold tracking-tight text-white">
                      {card.title}
                    </h3>
                    <span className="rounded-control border border-[#1FD1A0]/25 bg-[#0F6E56]/20 px-2 py-0.5 data-mono text-[10px] text-[#7CFFB2]">
                      {card.storyRef}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">{card.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-control border border-white/[0.1] px-2 py-0.5 data-mono text-[10px] text-white/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <PipelineShowcase />
        <WidgetPlayground />
        <RoiAndFaq />
        <ArchitectureDiagram />

        <section
          id="creator"
          className="relative border-t border-white/[0.08] bg-[#070a0f] px-6 py-24 md:px-10"
        >
          <div className="mx-auto max-w-6xl">
            <p className="data-mono text-[11px] uppercase tracking-[0.18em] text-[#7CFFB2]/80">
              Who Made It & Open Source
            </p>
            <h2
              data-section-title
              className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-white md:text-5xl"
            >
              Engineered in the open. Ready to self-host today.
            </h2>
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <article
                data-reveal
                className="rounded-panel border border-white/[0.1] bg-[#0c1219] p-6 md:p-8"
              >
                <h3 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  {creator.name}
                </h3>
                <p className="mt-2 data-mono text-sm text-[#7CFFB2]">
                  {creator.handle} · {creator.role}
                </p>
                <blockquote className="mt-5 border-l-2 border-[#1FD1A0] pl-4 font-display text-lg font-medium leading-snug text-white/90">
                  “{creator.quote}”
                </blockquote>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
                  {creator.summary}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Magnetic>
                    <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                      <Button className="bg-brand-500 hover:bg-brand-400">
                        <Github className="h-4 w-4" aria-hidden />
                        github.com/MTaheridev/AutoBI
                      </Button>
                    </a>
                  </Magnetic>
                  <a href={PROFILE_URL} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="secondary"
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    >
                      GitHub profile
                    </Button>
                  </a>
                  <Link href="/register">
                    <Button
                      variant="secondary"
                      className="border-[#1FD1A0]/30 bg-[#0F6E56]/20 text-[#CFF9E2] hover:bg-[#0F6E56]/35"
                    >
                      Launch your workspace
                    </Button>
                  </Link>
                </div>
              </article>

              <aside
                data-reveal
                className="rounded-panel border border-white/[0.1] bg-[#0c1219] p-6 md:p-8"
              >
                <h3 className="font-display text-lg font-semibold text-white">Production Stack</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {stackBadges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-control border border-white/[0.1] px-2.5 py-1 data-mono text-[11px] text-white/55"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <p className="mt-6 text-sm leading-relaxed text-white/55">
                  AutoBI 1.0 ships the full journey — connect, approve semantics, run safe queries,
                  and generate dashboards — with Argon2id + Redis sessions, connector pools, SMTP
                  invites, and Playwright CI smoke coverage.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/[0.08] bg-[#06080c] px-6 py-16 md:px-10">
          <div className="mx-auto max-w-6xl">
            <div style={{ containerType: 'inline-size' }}>
              <p ref={wordmark} className="landing-wordmark font-display font-semibold">
                AutoBI
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-4 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-white/50">
                  Your data stays in your databases. Your answers stay in your hands.
                </p>
                <p className="data-mono text-xs text-[#7CFFB2]/80">
                  Special thanks to Morteza, the one who made this idea come to my mind
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <a href="#story" className="landing-nav-link text-white/65 hover:text-white">
                  Origin story
                </a>
                <a href="#playground" className="landing-nav-link text-white/65 hover:text-white">
                  Playground
                </a>
                <Link href="/login" className="landing-nav-link text-white/65 hover:text-white">
                  Sign in
                </Link>
                <Link href="/register" className="landing-nav-link text-white/65 hover:text-white">
                  Create workspace
                </Link>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="landing-nav-link text-white/65 hover:text-white"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </SmoothScroll>
  );
}
