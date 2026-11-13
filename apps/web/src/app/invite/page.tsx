'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { api, ApiError, formatApiError } from '@/lib/api';
import { AuthFrame } from '@/components/auth-frame';
import { Button, Field, InlineError, Input } from '@/components/ui';

function InviteForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [token, setToken] = useState(search.get('token') ?? '');
  const [preview, setPreview] = useState<{
    email: string;
    workspaceName: string;
    role: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<{ invite: { email: string; workspaceName: string; role: string } }>(
      `/workspaces/invites/preview?token=${encodeURIComponent(token)}`,
    )
      .then((data) => setPreview(data.invite))
      .catch(() => setPreview(null));
  }, [token]);

  async function onAccept(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/workspaces/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      router.push('/workspace/agent');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/register?invite=${encodeURIComponent(token)}`);
        return;
      }
      setError(formatApiError(err, 'Accept failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Accept invite"
      description={
        preview
          ? `Join ${preview.workspaceName} as ${preview.role}`
          : 'Paste your invite token to join a workspace.'
      }
      footer={
        <>
          New here?{' '}
          <Link href={token ? `/register?invite=${encodeURIComponent(token)}` : '/register'}>
            Create account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onAccept}>
        <Field label="Invite token" htmlFor="invite-token">
          <Input
            id="invite-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        </Field>
        {preview ? (
          <p className="text-sm text-ink-muted">Invited email: {preview.email}</p>
        ) : null}
        <InlineError>{error}</InlineError>
        <Button
          className="w-full bg-brand-500 hover:bg-brand-400"
          disabled={loading || !token.trim()}
        >
          {loading ? 'Joining…' : 'Accept invite'}
        </Button>
      </form>
    </AuthFrame>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#06080c] text-sm text-white/55">
          Loading…
        </div>
      }
    >
      <InviteForm />
    </Suspense>
  );
}
