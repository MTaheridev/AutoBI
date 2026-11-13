import type { NextFunction, Request, Response } from 'express';
import { loadEnv } from '@autobi/config';
import { ForbiddenError } from '@autobi/shared';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Origin/Referer check for cookie-authenticated mutating requests (CSRF defense-in-depth with SameSite=Lax).
 */
export function csrfOriginMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (SAFE.has(req.method.toUpperCase())) {
    next();
    return;
  }

  // Unauthenticated auth endpoints still benefit from origin check when browser-sent
  const env = loadEnv();
  const allowed = new URL(env.API_CORS_ORIGIN);
  const origin = req.headers.origin;
  if (origin) {
    try {
      const o = new URL(origin);
      if (o.origin === allowed.origin) {
        next();
        return;
      }
    } catch {
      next(new ForbiddenError('Invalid origin'));
      return;
    }
    next(new ForbiddenError('Origin not allowed'));
    return;
  }

  const referer = req.headers.referer;
  if (referer) {
    try {
      const r = new URL(referer);
      if (r.origin === allowed.origin) {
        next();
        return;
      }
    } catch {
      next(new ForbiddenError('Invalid referer'));
      return;
    }
    next(new ForbiddenError('Referer not allowed'));
    return;
  }

  // Non-browser clients (curl, workers) often omit Origin/Referer — allow in non-production.
  if (env.NODE_ENV !== 'production') {
    next();
    return;
  }

  next(new ForbiddenError('Missing origin'));
}
