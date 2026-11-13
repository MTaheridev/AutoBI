const PASSWORD_KEYS = /^(password|apiKey|api_key|secret|token|authorization)$/i;

/** Redact secrets from arbitrary JSON-like values before persistence / SSE. */
export function redactSecrets<T>(value: T): T {
  return redactValue(value) as T;
}

function redactValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    return value
      .replace(/password\s*[:=]\s*["']?[^"'\s,}\]]+/gi, 'password=[REDACTED]')
      .replace(/api[_-]?key\s*[:=]\s*["']?[^"'\s,}\]]+/gi, 'apiKey=[REDACTED]')
      .replace(/\bAQ\.[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_KEY]')
      .replace(/\bAIza[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_KEY]')
      .replace(/\bsk-[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_KEY]');
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = PASSWORD_KEYS.test(k) ? '[REDACTED]' : redactValue(v);
    }
    return out;
  }
  return value;
}

export function redactText(text: string): string {
  return redactValue(text) as string;
}
