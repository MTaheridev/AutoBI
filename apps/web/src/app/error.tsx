'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-ink-muted" role="alert">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        type="button"
        className="rounded-control bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
