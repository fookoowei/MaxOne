'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseAmountToMinor } from '@/lib/format/parse-amount';
import { formatMoney } from '@/lib/format/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WalletSummary } from '@/components/wallet-list';

export function ConvertForm({ wallets }: { wallets: WalletSummary[] }) {
  const router = useRouter();
  const [fromId, setFromId] = useState(wallets[0]?.id ?? '');
  const [toId, setToId] = useState(wallets[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<{ converted: number; rate: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = wallets.find((w) => w.id === fromId);
  const to = wallets.find((w) => w.id === toId);

  async function getQuote() {
    setError(null);
    setQuote(null);
    if (fromId === toId || !from || !to) {
      setError('Pick two different wallets.');
      return;
    }
    const minor = parseAmountToMinor(amount);
    if (Number.isNaN(minor)) {
      setError('Enter a valid amount.');
      return;
    }
    const res = await fetch(`/api/rates/quote?from=${from.currency}&to=${to.currency}&amount=${minor}`);
    if (!res.ok) {
      setError('Could not fetch a rate. Try again.');
      return;
    }
    setQuote((await res.json()) as { converted: number; rate: string });
  }

  async function convert() {
    if (!quote || !from || !to) return;
    setBusy(true);
    setError(null);
    const minor = parseAmountToMinor(amount);
    const res = await fetch(`/api/wallets/${fromId}/transfers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ toWalletId: toId, amount: minor }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Conversion failed. Check your balance and try again.');
      return;
    }
    router.push('/');
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="from">From</Label>
        <select
          id="from"
          value={fromId}
          onChange={(e) => {
            setFromId(e.target.value);
            setQuote(null);
          }}
          className="w-full rounded-md border bg-background p-2 text-sm"
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.currency} — {formatMoney(w.balance, w.currency)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="to">To</Label>
        <select
          id="to"
          value={toId}
          onChange={(e) => {
            setToId(e.target.value);
            setQuote(null);
          }}
          className="w-full rounded-md border bg-background p-2 text-sm"
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.currency}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="amount">Amount ({from?.currency})</Label>
        <Input
          id="amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setQuote(null);
          }}
        />
      </div>

      {!quote && (
        <Button type="button" variant="outline" className="w-full" onClick={getQuote}>
          Get quote
        </Button>
      )}

      {quote && to && (
        <>
          <p className="text-sm">
            ≈ <span className="font-semibold">{formatMoney(quote.converted, to.currency)}</span>{' '}
            <span className="text-muted-foreground">at {quote.rate}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Rate is indicative; the final amount is set at confirmation.
          </p>
          <Button type="button" className="w-full" onClick={convert} disabled={busy}>
            {busy ? 'Converting…' : 'Convert'}
          </Button>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
