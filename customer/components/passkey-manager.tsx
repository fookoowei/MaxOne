'use client';

import { useEffect, useState } from 'react';
import { isPasskeySupported, registerPasskey } from '@/lib/passkeys/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface PasskeySummary {
  id: string;
  label: string | null;
  deviceType: string | null;
  createdAt: string;
}

// Register / list / remove device passkeys (Face ID, Touch ID, Windows Hello…).
export function PasskeyManager({ initial }: { initial: PasskeySummary[] }) {
  const [passkeys, setPasskeys] = useState(initial);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null); // decided client-side (no SSR mismatch)

  useEffect(() => setSupported(isPasskeySupported()), []);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const ok = await registerPasskey(label || undefined);
      if (!ok) {
        setError('Could not add the passkey. Try again.');
        return;
      }
      const r = await fetch('/api/passkeys');
      if (r.ok) setPasskeys((await r.json()) as PasskeySummary[]);
      setLabel('');
    } catch {
      setError('Passkey setup was cancelled.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const r = await fetch(`/api/passkeys/${id}`, { method: 'DELETE' });
    if (r.ok) setPasskeys((p) => p.filter((k) => k.id !== id));
  }

  return (
    <div className="space-y-3">
      {passkeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No passkeys yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {passkeys.map((k) => (
            <li key={k.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{k.label ?? 'Passkey'}</p>
                <p className="text-xs text-muted-foreground">
                  {k.deviceType === 'multiDevice' ? 'Synced' : 'This device'} · added{' '}
                  {new Date(k.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(k.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {supported === false ? (
        <p className="text-xs text-muted-foreground">Passkeys aren’t supported in this browser.</p>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="passkey-label">Name (optional)</Label>
            <Input
              id="passkey-label"
              placeholder="e.g. MacBook Touch ID"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Button type="button" onClick={add} disabled={busy || supported === null}>
            {busy ? 'Adding…' : 'Add passkey'}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
