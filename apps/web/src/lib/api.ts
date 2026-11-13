const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const CODE_HINTS: Record<string, string> = {
  AUTH_LOCKED: 'Wait for the lockout window to end, then try again.',
  RATE_LIMITED: 'Slow down and retry in a minute.',
  SCHEMA_REQUIRED: 'Run schema introspection on the data source first.',
  VALIDATION_ERROR: 'Fix the highlighted fields and retry.',
  EMAIL_TAKEN: 'Sign in instead, or use a different email.',
  FORBIDDEN: 'You need a higher workspace role for this action.',
  NOT_FOUND: 'The resource may have been deleted — refresh and try again.',
  INTERNAL_ERROR: 'Something went wrong on the server.',
};

function fieldErrorsFromDetails(details: unknown): string[] {
  if (!details || typeof details !== 'object') return [];
  const d = details as Record<string, unknown>;
  const fieldErrors = d.fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== 'object') return [];
  const lines: string[] = [];
  for (const [field, msgs] of Object.entries(fieldErrors as Record<string, unknown>)) {
    if (Array.isArray(msgs) && msgs.length) {
      lines.push(`${field}: ${msgs.filter((m) => typeof m === 'string').join(', ')}`);
    } else if (typeof msgs === 'string') {
      lines.push(`${field}: ${msgs}`);
    }
  }
  return lines;
}

/** Human-readable API error for UI banners. */
export function formatApiError(err: unknown, fallback = 'Request failed'): string {
  if (!(err instanceof ApiError)) {
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  }

  const parts: string[] = [err.message || fallback];
  const fields = fieldErrorsFromDetails(err.details);
  if (fields.length) parts.push(fields.slice(0, 4).join(' · '));

  const hint = CODE_HINTS[err.code];
  if (hint && !parts[0].includes(hint)) parts.push(hint);

  if (err.code === 'INTERNAL_ERROR' && err.requestId) {
    parts.push(`Reference: ${err.requestId}`);
  }

  return parts.filter(Boolean).join(' — ');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message ?? 'Request failed',
      data?.error?.code ?? 'HTTP_ERROR',
      response.status,
      data?.error?.details,
      data?.error?.requestId,
    );
  }
  return data as T;
}
