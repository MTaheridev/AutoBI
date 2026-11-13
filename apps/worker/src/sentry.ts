import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(dsn: string | undefined): void {
  if (!dsn || initialized) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.05,
  });
  initialized = true;
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
