'use client';

import { useEffect, useState } from 'react';
import { isPasskeySupported, registerPasskey } from '@/lib/passkeys/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/layout/confirm-dialog';
import { apiRequest, toastApiError } from '@/lib/api/client';
import { toast } from 'sonner';

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
  const [removing, setRemoving] = useState<PasskeySummary | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null); // decided client-side (no SSR mismatch)

  useEffect(() => setSupported(isPasskeySupported()), []);

  async function add() {
    setBusy(true);
    try {
      const ok = await registerPasskey(label || undefined);
      if (!ok) {
        toast.error('Could not add the passkey. Try again.');
        return;
      }
      const r = await fetch('/api/passkeys');
      if (r.ok) setPasskeys((await r.json()) as PasskeySummary[]);
      setLabel('');
    } catch {
      toast.error('Passkey setup was cancelled.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setRemoveBusy(true);
    const r = await apiRequest(`/api/passkeys/${removing.id}`, { method: 'DELETE' });
    setRemoveBusy(false);
    if (!r.ok) return toastApiError(r.error);
    setPasskeys((p) => p.filter((k) => k.id !== removing.id));
    setRemoving(null);
    toast.success('Passkey removed');
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
              <Button type="button" variant="ghost" size="sm" onClick={() => setRemoving(k)}>
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
          <Button type="button" onClick={add} pending={busy} disabled={supported === null}>
            Add passkey
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove passkey “${removing?.label ?? 'Passkey'}”?`}
        description="You will need your password (and code, if 2FA is on) to sign in from that device next time."
        actionLabel="Remove passkey"
        pending={removeBusy}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
