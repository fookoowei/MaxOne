'use client';

import { useState } from 'react';
import { stepUpWithPasskey } from '@/lib/passkeys/client';
import { apiRequest, toastApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * M14c step-up, extracted: a 2FA user re-proves their factor right before money moves. Either a
 * code (authenticator or recovery) exchanged for a short-lived grant, or a passkey. `onGrant`
 * receives the grant token; the caller retries its request with it.
 */
export function StepUpPrompt({ onGrant, pending }: { onGrant: (token: string) => Promise<void>; pending: boolean }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await apiRequest<{ stepUpToken: string }>('/api/auth/step-up', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) });
    setBusy(false);
    if (!r.ok) {
      toastApiError(r.error, { HTTP_401: 'That code did not work — try the next one.', HTTP_400: 'That code did not work — try the next one.' });
      return;
    }
    setCode('');
    await onGrant(r.data.stepUpToken);
  }

  async function passkey() {
    setBusy(true);
    try {
      const grant = await stepUpWithPasskey();
      setBusy(false);
      if (!grant) {
        toastApiError({ status: 0, code: 'PASSKEY', message: 'Passkey verification failed.' });
        return;
      }
      await onGrant(grant);
    } catch {
      setBusy(false);
      toastApiError({ status: 0, code: 'PASSKEY', message: 'Passkey verification was cancelled.' });
    }
  }

  return (
    <form onSubmit={verify} className="space-y-3 rounded-[20px] border bg-card p-4" noValidate>
      <p className="text-sm font-medium">Confirm it is you</p>
      <p className="text-xs text-muted-foreground">Enter your authenticator code (or a recovery code) to send this money.</p>
      <div className="space-y-1.5">
        <Label htmlFor="step-up-code">Authentication code</Label>
        <Input id="step-up-code" inputMode="numeric" autoComplete="one-time-code" className="h-11 text-base" value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <Button type="submit" size="xl" className="w-full" pending={busy || pending} disabled={!code}>
        Verify and send
      </Button>
      <Button type="button" variant="outline" size="xl" className="w-full" onClick={() => void passkey()} pending={busy || pending}>
        Use passkey instead
      </Button>
    </form>
  );
}
