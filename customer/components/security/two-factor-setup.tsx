'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Phase = 'idle' | 'qr' | 'recovery' | 'enabled' | 'disabling';
const JSON_HEADERS = { 'content-type': 'application/json' };

// Enable/disable TOTP 2FA. Flow: idle → (setup) qr → (verify) recovery codes shown ONCE → enabled.
export function TwoFactorSetup({ initialEnabled }: { initialEnabled: boolean }) {
  const [phase, setPhase] = useState<Phase>(initialEnabled ? 'enabled' : 'idle');
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/2fa/setup', { method: 'POST' });
    setBusy(false);
    if (!res.ok) return setError('Could not start setup. Try again.');
    const { qrDataUrl } = (await res.json()) as { qrDataUrl: string };
    setQr(qrDataUrl);
    setPhase('qr');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/2fa/verify', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!res.ok) return setError('That code didn’t work — try the next one.');
    const data = (await res.json()) as { recoveryCodes: string[] };
    setRecoveryCodes(data.recoveryCodes);
    setCode('');
    setPhase('recovery');
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/2fa/disable', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!res.ok) return setError('Invalid code.');
    setCode('');
    setPhase('idle');
  }

  const codeField = (id: string) => (
    <div className="space-y-1">
      <Label htmlFor={id}>Authentication code</Label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
    </div>
  );

  if (phase === 'idle') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Two-factor authentication is off.</p>
        <Button onClick={start} disabled={busy}>
          {busy ? 'Starting…' : 'Enable 2FA'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  if (phase === 'qr') {
    return (
      <form onSubmit={verify} className="space-y-4" noValidate>
        <p className="text-sm">Scan this with Google Authenticator or Authy, then enter the code it shows.</p>
        {qr && <img src={qr} alt="Scan with your authenticator app" className="h-44 w-44 rounded-md bg-white p-2" />}
        {codeField('setup-code')}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || !code}>
          {busy ? 'Verifying…' : 'Verify & enable'}
        </Button>
      </form>
    );
  }

  if (phase === 'recovery') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">2FA is on. Save these recovery codes — each works once.</p>
        <p className="text-xs text-muted-foreground">
          If you lose your phone, a recovery code is the only way back in. They won’t be shown again.
        </p>
        <ul className="grid grid-cols-2 gap-1 rounded-md border bg-muted/40 p-3 font-mono text-sm">
          {recoveryCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Button onClick={() => setPhase('enabled')}>I’ve saved them</Button>
      </div>
    );
  }

  if (phase === 'disabling') {
    return (
      <form onSubmit={disable} className="space-y-4" noValidate>
        <p className="text-sm">Enter a current code — or one of your recovery codes — to turn 2FA off.</p>
        {codeField('disable-code')}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="destructive" disabled={busy || !code}>
            {busy ? 'Turning off…' : 'Turn off 2FA'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setPhase('enabled')}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-emerald-600">✓ Two-factor authentication is on.</p>
      <Button variant="outline" onClick={() => setPhase('disabling')}>
        Turn off
      </Button>
    </div>
  );
}
