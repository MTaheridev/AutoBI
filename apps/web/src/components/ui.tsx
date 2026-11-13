import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-[transform,background-color,box-shadow,opacity,color] duration-200 ease-[var(--ease-out-expo)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 motion-safe:active:scale-[0.98]',
        variant === 'primary' &&
          'bg-brand-600 text-white shadow-soft hover:bg-brand-700 hover:shadow-md',
        variant === 'secondary' &&
          'border border-line bg-surface-elevated text-ink hover:bg-surface-muted',
        variant === 'ghost' && 'text-ink-muted hover:bg-surface-muted hover:text-ink',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
      {...props}
    />
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      className="rounded-control border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-300"
      role="alert"
    >
      {children}
    </p>
  );
}

export function InlineWarning({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      className="rounded-control border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
      role="status"
    >
      {children}
    </p>
  );
}

export function InlineSuccess({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      className="rounded-control border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300"
      role="status"
    >
      {children}
    </p>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-control border border-line bg-surface-elevated px-3 py-2 text-sm text-ink outline-none ring-brand-600/25 placeholder:text-ink-muted focus:border-brand-500 focus:ring-2',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-control border border-line bg-surface-elevated px-3 py-2 text-sm text-ink outline-none ring-brand-600/25 focus:border-brand-500 focus:ring-2',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tone === 'neutral' && 'bg-surface-muted text-ink-muted',
        tone === 'success' && 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
        tone === 'warning' && 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
        tone === 'danger' && 'bg-red-500/15 text-red-800 dark:text-red-300',
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-start justify-center gap-3 px-6 py-12 sm:items-center sm:text-center">
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function DataToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-2 border-b border-line pb-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
