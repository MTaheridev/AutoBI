export type ClientErrorCategory =
  | 'auth'
  | 'unreachable'
  | 'tls'
  | 'host_blocked'
  | 'unknown';

const CATEGORY_MESSAGES: Record<ClientErrorCategory, string> = {
  auth: 'Authentication failed — check username and password',
  unreachable: 'Host unreachable — check host, port, and firewall',
  tls: 'TLS/SSL handshake failed — check certificates and SSL settings',
  host_blocked: 'Host blocked by safety policy — private or loopback hosts need DB_HOST_ALLOW_PRIVATE',
  unknown: 'Operation failed',
};

function collectErrorText(error: unknown): string {
  if (error == null) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    const withCode = error as Error & { code?: string; errno?: string | number };
    const parts = [error.message, withCode.code, withCode.errno != null ? String(withCode.errno) : ''];
    if (error.cause) parts.push(collectErrorText(error.cause));
    return parts.filter(Boolean).join(' ');
  }
  if (typeof error === 'object') {
    const o = error as Record<string, unknown>;
    return [o.message, o.code, o.errno, o.sqlMessage, o.name]
      .filter((v) => typeof v === 'string' || typeof v === 'number')
      .map(String)
      .join(' ');
  }
  return String(error);
}

/** Classify connector/DB failures into safe categories (never expose raw driver text). */
export function classifyClientError(error: unknown): ClientErrorCategory {
  const text = collectErrorText(error).toLowerCase();

  if (
    /host.?blocked|private.?host|loopback|db_host_allow_private|ssrf|not allowed/i.test(text)
  ) {
    return 'host_blocked';
  }

  if (
    /password authentication failed|access denied|login failed|authentication failed|invalid.?password|er_access_denied|28000|28p01|auth.?fail|wrong.?password|eperm.*auth/i.test(
      text,
    )
  ) {
    return 'auth';
  }

  if (
    /certificate|ssl|tls|self.?signed|unable to verify|handshake|secure.?connection|err_tls|openssl/i.test(
      text,
    )
  ) {
    return 'tls';
  }

  if (
    /econnrefused|etimedout|enotfound|eai_again|ehostunreach|enetunreach|econnreset|timeout|getaddrinfo|could not connect|connection refused|server closed|no such host|connect.?econnrefused|socket hang up/i.test(
      text,
    )
  ) {
    return 'unreachable';
  }

  return 'unknown';
}

/**
 * Client-safe connector/DB error message — never forward raw driver text.
 * Uses category heuristics when possible; otherwise `fallback`.
 */
export function sanitizeClientError(
  error: unknown,
  fallback = 'Operation failed',
): string {
  const category = classifyClientError(error);
  if (category === 'unknown') {
    // If the input was already one of our safe messages, keep it.
    if (typeof error === 'string') {
      const known = Object.values(CATEGORY_MESSAGES);
      if (known.includes(error) || error === fallback) return error;
      // Already-sanitized connector message from a previous pass
      if (
        /authentication failed|host unreachable|tls\/ssl|host blocked|connection failed|introspection failed|query execution failed/i.test(
          error,
        )
      ) {
        return error;
      }
    }
    return fallback;
  }
  return CATEGORY_MESSAGES[category];
}

/** Short server-side detail for logs/storage (truncated, no passwords). */
export function summarizeInternalError(error: unknown, maxLen = 240): string {
  const raw = error instanceof Error ? error.message : String(error);
  const scrubbed = raw
    .replace(/password=[^&\s]+/gi, 'password=***')
    .replace(/pwd=[^&\s]+/gi, 'pwd=***');
  return scrubbed.length > maxLen ? `${scrubbed.slice(0, maxLen)}…` : scrubbed;
}
