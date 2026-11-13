'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const MOTION_OK = '(prefers-reduced-motion: no-preference)';

type MagneticProps = {
  children: ReactNode;
  className?: string;
  strength?: number;
  field?: number;
};

export function Magnetic({ children, className, strength = 0.32, field = 20 }: MagneticProps) {
  const zone = useRef<HTMLSpanElement>(null);
  const target = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!matchMedia(FINE_POINTER).matches || !matchMedia(MOTION_OK).matches) return;

      const z = zone.current;
      const t = target.current;
      if (!z || !t) return;

      let cachedRect: DOMRect | null = null;
      const vars = { duration: 0.85, ease: 'elastic.out(1, 0.35)' };
      const xTo = gsap.quickTo(t, 'x', vars);
      const yTo = gsap.quickTo(t, 'y', vars);

      const onEnter = () => {
        cachedRect = z.getBoundingClientRect();
        t.style.willChange = 'transform';
      };

      const onMove = (event: PointerEvent) => {
        const rect = cachedRect ?? (cachedRect = z.getBoundingClientRect());
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        xTo((event.clientX - cx) * strength);
        yTo((event.clientY - cy) * strength);
      };

      const onLeave = () => {
        cachedRect = null;
        xTo(0);
        yTo(0);
        window.setTimeout(() => {
          if (t) t.style.willChange = 'auto';
        }, 900);
      };

      z.addEventListener('pointerenter', onEnter);
      z.addEventListener('pointermove', onMove);
      z.addEventListener('pointerleave', onLeave);
      return () => {
        z.removeEventListener('pointerenter', onEnter);
        z.removeEventListener('pointermove', onMove);
        z.removeEventListener('pointerleave', onLeave);
      };
    },
    { scope: zone },
  );

  return (
    <span
      ref={zone}
      className={['inline-flex', className].filter(Boolean).join(' ')}
      style={{ padding: field }}
    >
      <span ref={target} className="inline-flex">
        {children}
      </span>
    </span>
  );
}
