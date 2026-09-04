'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth';
import { loginWithPasskey } from '@/lib/passkeys/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  // 2FA: when the password step returns a challenge, we swap to the code step.
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [pkBusy, setPkBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Something went wrong.' }));
      setServerError(error);
      return;
    }
    const data = await res.json();
    if (data.requires2fa) {
      setChallenge(data.challengeToken); // → code step; no cookies were set yet
      return;
    }
    router.push('/');
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setVerifying(true);
    const res = await fetch('/api/auth/login/2fa', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ challengeToken: challenge, code }),
    });
    setVerifying(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Invalid code.' }));
      setServerError(error);
      return;
    }
    router.push('/');
  }

  // Usernameless passkey sign-in — no password, and a passkey needs no TOTP step.
  async function passkeyLogin() {
    setServerError(null);
    setPkBusy(true);
    try {
      const ok = await loginWithPasskey();
      if (ok) router.push('/');
      else setServerError('Passkey sign-in failed. Try your password instead.');
    } catch {
      setServerError('Passkey sign-in was cancelled.');
    } finally {
      setPkBusy(false);
    }
  }

  if (challenge) {
    return (
      <form key="2fa-step" onSubmit={onSubmitCode} className="space-y-4" noValidate>
        <div className="space-y-1">
          <Label htmlFor="code">Authentication code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code or a recovery code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            From your authenticator app — or use one of your recovery codes.
          </p>
        </div>
        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={verifying || !code}>
          {verifying ? 'Verifying…' : 'Verify'}
        </Button>
      </form>
    );
  }

  return (
    <form key="password-step" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in…' : 'Log in'}
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={passkeyLogin} disabled={pkBusy}>
        {pkBusy ? 'Waiting for your device…' : 'Sign in with passkey'}
      </Button>
    </form>
  );
}
