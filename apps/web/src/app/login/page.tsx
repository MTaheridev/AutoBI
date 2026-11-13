'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api, formatApiError } from '@/lib/api';
import { AuthFrame } from '@/components/auth-frame';
import { Button, Field, InlineError, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const next = new URLSearchParams(window.location.search).get('next');
      const safeNext =
        next && next.startsWith('/') && !next.startsWith('//') ? next : '/workspace/agent';
      router.push(safeNext);
    } catch (err) {
      setError(formatApiError(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Sign in"
      description="Land in Agent Mode — connect a database and ship a dashboard in one conversation."
      footer={
        <>
          No account? <Link href="/register">Create one</Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
          />
        </Field>
        <InlineError>{error}</InlineError>
        <Button className="w-full bg-brand-500 hover:bg-brand-400" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="data-mono text-center text-[11px] text-ink-muted">
          Argon2id · Redis session · email verified
        </p>
      </form>
    </AuthFrame>
  );
}
