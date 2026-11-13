'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { api, formatApiError } from '@/lib/api';
import { AuthFrame } from '@/components/auth-frame';
import { Button, Field, InlineError, Input } from '@/components/ui';

function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const inviteToken = search.get('invite') ?? undefined;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifyHint, setVerifyHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    api<{ invite: { email: string; workspaceName: string; role: string } }>(
      `/workspaces/invites/preview?token=${encodeURIComponent(inviteToken)}`,
    )
      .then((data) => {
        setEmail(data.invite.email);
      })
      .catch(() => undefined);
  }, [inviteToken]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVerifyHint(null);
    try {
      const data = await api<{
        emailVerificationToken?: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          ...(inviteToken ? { inviteToken } : {}),
        }),
      });
      if (data.emailVerificationToken) {
        setVerifyHint(data.emailVerificationToken);
      }
      router.push('/workspace/agent');
    } catch (err) {
      setError(formatApiError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Create account"
      description={
        inviteToken
          ? 'Accepting a workspace invite.'
          : 'Connect a database, approve semantics, ship dashboards — same instrument as the rest of AutoBI.'
      }
      footer={
        <>
          Already registered? <Link href="/login">Sign in</Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={Boolean(inviteToken)}
          />
        </Field>
        <Field label="Password" htmlFor="register-password">
          <Input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={10}
            required
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="mt-1 text-xs text-ink-muted">
            At least 10 characters with upper, lower, and a digit.
          </p>
        </Field>
        <InlineError>{error}</InlineError>
        {verifyHint ? (
          <p className="break-all data-mono text-xs text-ink-muted" role="status">
            Dev verify token: {verifyHint}
          </p>
        ) : null}
        <Button className="w-full bg-brand-500 hover:bg-brand-400" disabled={loading}>
          {loading ? 'Creating…' : inviteToken ? 'Join workspace' : 'Create account'}
        </Button>
      </form>
    </AuthFrame>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#06080c] text-sm text-white/55">
          Loading…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
