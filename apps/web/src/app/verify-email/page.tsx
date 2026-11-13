'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { api, formatApiError } from '@/lib/api';
import { AuthFrame } from '@/components/auth-frame';
import { Button, Field, InlineError, Input } from '@/components/ui';

function VerifyForm() {
  const search = useSearchParams();
  const [token, setToken] = useState(search.get('token') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setDone(true);
    } catch (err) {
      setError(formatApiError(err, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Verify email"
      description="Paste the verification token from your registration email (or dev response)."
    >
      {done ? (
        <p className="text-sm text-[#7CFFB2]" role="status">
          Email verified.{' '}
          <Link className="font-medium text-white underline" href="/login">
            Sign in
          </Link>
        </p>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Token" htmlFor="verify-token">
            <Input
              id="verify-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </Field>
          <InlineError>{error}</InlineError>
          <Button
            className="w-full bg-brand-500 hover:bg-brand-400"
            disabled={loading || !token.trim()}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#06080c] text-sm text-white/55">
          Loading…
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
