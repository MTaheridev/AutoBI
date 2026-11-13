import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
      <p className="font-display text-3xl font-semibold tracking-tight">AutoBI</p>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-ink-muted">That route does not exist.</p>
      <Link href="/" className="text-sm font-medium text-brand-700 underline dark:text-brand-300">
        Go home
      </Link>
    </div>
  );
}
