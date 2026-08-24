'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseAmountToMinor } from '@/lib/format/parse-amount';
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
  const [handle, setHandle] = useState(prefillHandle);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function send() {
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
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ toWalletId: recipient.walletId, amount: minor, note: note || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Could not send. Check your balance and try again.');
      return;
    }
    router.push('/');
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

      {recipient && (
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
          <Button type="button" className="w-full" onClick={send} disabled={busy}>
            {busy ? 'Sending…' : 'Send'}
          </Button>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
