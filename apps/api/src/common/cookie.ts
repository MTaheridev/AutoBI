import type { CookieOptions, Response } from 'express';
import { loadEnv } from '@autobi/config';

export function sessionCookieOptions(): CookieOptions {
  const env = loadEnv();
  const opts: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    signed: true,
  };
  if (env.COOKIE_DOMAIN) {
    opts.domain = env.COOKIE_DOMAIN;
  }
  return opts;
}

export function setSessionCookie(res: Response, name: string, sessionId: string) {
  res.cookie(name, sessionId, sessionCookieOptions());
}

export function clearSessionCookie(res: Response, name: string) {
  const opts = sessionCookieOptions();
  res.clearCookie(name, {
    path: opts.path,
    sameSite: opts.sameSite,
    secure: opts.secure,
    httpOnly: opts.httpOnly,
    signed: opts.signed,
    domain: opts.domain,
  });
}
