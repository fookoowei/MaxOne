'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseAmountToMinor } from '@/lib/format/parse-amount';
import { stepUpWithPasskey } from '@/lib/passkeys/client';
import { useIdempotencyKey } from '@/lib/idempotency/key';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Recipient {
  walletId: string;
  currency: string;
  recipientName: string;
}

export function TransferForm({
  myWalletId,
  myCurrency,
  prefillHandle = '',
}: {
  myWalletId: string;
  myCurrency: string;
  prefillHandle?: string;
}) {
  const router = useRouter();
  const idem = useIdempotencyKey();
  const [handle, setHandle] = useState(prefillHandle);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // M14c step-up: a 2FA user must re-prove their factor right before sending.
  const [stepUp, setStepUp] = useState(false);
  const [code, setCode] = useState('');

  async function findRecipient() {
    setError(null);
    setRecipient(null);
    const res = await fetch(`/api/wallets/lookup?handle=${encodeURIComponent(handle.toLowerCase())}`);
    if (!res.ok) {
      setError('No one found with that handle.');
      return;
    }
    const r = (await res.json()) as Recipient;
    if (r.walletId === myWalletId) {
      setError("You can't send to yourself.");
      return;
    }
    if (r.currency !== myCurrency) {
      setError('Cross-currency sending is coming soon.');
      return;
    }
    setRecipient(r);
  }

  async function send(stepUpToken?: string) {
    setError(null);
    const minor = parseAmountToMinor(amount);
    if (Number.isNaN(minor)) {
      setError('Enter a valid amount.');
      return;
    }
    if (!recipient) return;
    setBusy(true);
    const res = await fetch(`/api/wallets/${myWalletId}/transfers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': idem.key(),
        ...(stepUpToken ? { 'x-step-up-token': stepUpToken } : {}),
      },
      body: JSON.stringify({ toWalletId: recipient.walletId, amount: minor, note: note || undefined }),
    });
    setBusy(false);
    if (res.status === 403) {
      const body = (await res.json().catch(() => ({}))) as { code?: string };
      if (body.code === 'STEP_UP_REQUIRED') {
        setStepUp(true); // show the code prompt; verifyAndSend retries with the grant
        return;
      }
    }
    if (!res.ok) {
      setError('Could not send. Check your balance and try again.');
      return;
    }
    idem.reset();
    router.push('/');
  }

  async function verifyAndSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch('/api/auth/step-up', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('That code didn’t work — try the next one.');
      return;
    }
    const { stepUpToken } = (await res.json()) as { stepUpToken: string };
    setStepUp(false);
    setCode('');
    await send(stepUpToken); // retry the transfer with the fresh grant
  }

  // Alternative step-up: a passkey (Face/Touch ID) instead of typing a code.
  async function passkeyStepUp() {
    setError(null);
    setBusy(true);
    try {
      const grant = await stepUpWithPasskey();
      setBusy(false);
      if (!grant) {
        setError('Passkey verification failed.');
        return;
      }
      setStepUp(false);
      await send(grant);
    } catch {
      setBusy(false);
      setError('Passkey verification was cancelled.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="handle">Recipient handle</Label>
        <div className="flex gap-2">
          <Input
            id="handle"
            placeholder="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={findRecipient}>
            Find
          </Button>
        </div>
      </div>

      {recipient && (
        <p className="text-sm">
          Send to <span className="font-medium">{recipient.recipientName}</span>
        </p>
      )}

      {recipient && stepUp && (
        <form onSubmit={verifyAndSend} className="space-y-3 rounded-md border p-3" noValidate>
          <p className="text-sm font-medium">Confirm it’s you</p>
          <p className="text-xs text-muted-foreground">
            Enter your authenticator code (or a recovery code) to send this transfer.
          </p>
          <div className="space-y-1">
            <Label htmlFor="step-up-code">Authentication code</Label>
            <Input
              id="step-up-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !code}>
            {busy ? 'Verifying…' : 'Verify & send'}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={passkeyStepUp} disabled={busy}>
            Use passkey instead
          </Button>
        </form>
      )}

      {recipient && !stepUp && (
        <>
          <div className="space-y-1">
            <Label htmlFor="amount">Amount ({myCurrency})</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="button" className="w-full" onClick={() => send()} disabled={busy}>
            {busy ? 'Sending…' : 'Send'}
          </Button>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
