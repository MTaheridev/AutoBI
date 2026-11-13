import type { Request } from 'express';
import { trustProxy } from '@autobi/config';

/**
 * Client IP for rate limiting. Uses Express `req.ip` (honors trust proxy when enabled).
 * Never reads raw X-Forwarded-For without TRUST_PROXY=true.
 */
export function clientIp(req: Request): string {
  if (trustProxy()) {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
  return req.socket.remoteAddress || 'unknown';
}
