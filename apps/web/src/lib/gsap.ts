'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

export const EASE = {
  out: 'expo.out',
  inOut: 'power3.inOut',
  scrub: 'none',
} as const;

export const DUR = {
  fast: 0.35,
  base: 0.8,
  slow: 1.2,
} as const;

export const STAGGER = {
  tight: 0.04,
  base: 0.08,
  loose: 0.14,
} as const;

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
  gsap.defaults({ ease: EASE.out, duration: DUR.base });
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
