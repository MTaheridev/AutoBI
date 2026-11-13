import { lookup } from 'node:dns/promises';
import { ValidationError } from './errors.js';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
}

function isPrivateOrLocalIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  if (n >= 0x00000000 && n <= 0x00ffffff) return true;
  if (n >= 0x0a000000 && n <= 0x0affffff) return true;
  if (n >= 0x7f000000 && n <= 0x7fffffff) return true;
  if (n >= 0xa9fe0000 && n <= 0xa9feffff) return true;
  if (n >= 0xac100000 && n <= 0xac1fffff) return true;
  if (n >= 0xc0a80000 && n <= 0xc0a8ffff) return true;
  return false;
}

function isBlockedIpv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === '::1' || h === '::') return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true;
  if (h.startsWith('fe80')) return true;
  return false;
}

export type HostGuardOptions = {
  /** When false (typical production), private/loopback IPs and localhost are rejected. */
  allowPrivate?: boolean;
  /**
   * Optional DNS resolver (tests). Defaults to dns.promises.lookup with `{ all: true }`.
   */
  resolve?: (hostname: string) => Promise<Array<{ address: string; family: number }>>;
};

function assertSafeLiteralHost(bare: string, allowPrivate: boolean): void {
  if (BLOCKED_HOSTNAMES.has(bare) && !allowPrivate) {
    throw new ValidationError('Database host is not allowed');
  }

  if (
    bare.includes('metadata.google') ||
    (bare.endsWith('.internal') && bare.includes('metadata'))
  ) {
    throw new ValidationError('Database host is not allowed');
  }

  const n = /^\d+\.\d+\.\d+\.\d+$/.test(bare) ? ipv4ToInt(bare) : null;
  if (n !== null && n >= 0xa9fe0000 && n <= 0xa9feffff) {
    throw new ValidationError('Database host is not allowed');
  }

  if (bare.includes(':')) {
    if (bare.toLowerCase().replace(/^\[|\]$/g, '').startsWith('fe80')) {
      throw new ValidationError('Database host is not allowed');
    }
    if (isBlockedIpv6(bare) && !allowPrivate) {
      throw new ValidationError('Database host is not allowed');
    }
    return;
  }

  if (n !== null) {
    if (isPrivateOrLocalIpv4(bare) && !allowPrivate) {
      throw new ValidationError('Database host is not allowed');
    }
  }
}

function assertSafeResolvedAddress(address: string, allowPrivate: boolean): void {
  const bare = address.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!bare) throw new ValidationError('Database host is not allowed');

  // Always block link-local / metadata IPv4
  const n = /^\d+\.\d+\.\d+\.\d+$/.test(bare) ? ipv4ToInt(bare) : null;
  if (n !== null && n >= 0xa9fe0000 && n <= 0xa9feffff) {
    throw new ValidationError('Database host is not allowed');
  }

  if (bare.includes(':')) {
    if (isBlockedIpv6(bare) && (!allowPrivate || bare.startsWith('fe80'))) {
      throw new ValidationError('Database host is not allowed');
    }
    if (!allowPrivate && isBlockedIpv6(bare)) {
      throw new ValidationError('Database host is not allowed');
    }
    return;
  }

  if (n !== null && isPrivateOrLocalIpv4(bare) && !allowPrivate) {
    throw new ValidationError('Database host is not allowed');
  }
}

function isIpLiteral(host: string): boolean {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (host.includes(':')) return true;
  return false;
}

/**
 * Rejects hosts that are commonly used for SSRF (metadata, link-local, loopback, private).
 * Resolves DNS and validates every returned address (rebinding defense).
 */
export async function assertSafeDbHost(
  host: string,
  options: HostGuardOptions = {},
): Promise<void> {
  const allowPrivate = options.allowPrivate ?? false;
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) throw new ValidationError('Database host is required');

  const bare = trimmed.replace(/^\[|\]$/g, '');
  assertSafeLiteralHost(bare, allowPrivate);

  if (isIpLiteral(bare)) {
    return;
  }

  const resolve =
    options.resolve ??
    ((hostname: string) => lookup(hostname, { all: true }));

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await resolve(bare);
  } catch {
    throw new ValidationError('Database host could not be resolved');
  }

  if (!addresses.length) {
    throw new ValidationError('Database host could not be resolved');
  }

  for (const entry of addresses) {
    assertSafeResolvedAddress(entry.address, allowPrivate);
  }
}
