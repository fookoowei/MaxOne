'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// `held` = currency codes the customer already has, so we don't offer duplicates.
export function AddWalletForm({ held }: { held: string[] }) {
  const router = useRouter();
  const options = SUPPORTED_CURRENCIES.filter((c) => !held.includes(c.code));
  const [currency, setCurrency] = useState(options[0]?.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await fetch('/api/wallets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currency }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Could not add that wallet. Please try again.');
      return;
    }
    router.push('/');
  }

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">You already hold every supported currency.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="currency">Currency</Label>
        <select
          id="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-md border bg-background p-2 text-sm"
        >
          {options.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" className="w-full" onClick={submit} disabled={busy}>
        {busy ? 'Adding…' : 'Add wallet'}
      </Button>
    </div>
  );
}
