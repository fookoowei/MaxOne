import { KeyRound, ShieldCheck } from 'lucide-react';
import { Panel } from '@/components/layout/panel';
import { StatusPill } from '@/components/status-pill';

// Desktop aside on Profile: the two security facts that matter, as a status list.
export function SecurityStatusCard({ twoFactorEnabled, passkeyCount }: { twoFactorEnabled: boolean; passkeyCount: number }) {
  const passkeys = passkeyCount === 0 ? 'None yet' : passkeyCount === 1 ? '1 passkey' : `${passkeyCount} passkeys`;
  return (
    <Panel padded title="Security">
      <ul className="mt-1 divide-y text-sm">
        <li className="flex items-center justify-between py-3">
          <span className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
            Two-factor authentication
          </span>
          <StatusPill tone={twoFactorEnabled ? 'approved' : 'neutral'}>{twoFactorEnabled ? 'On' : 'Off'}</StatusPill>
        </li>
        <li className="flex items-center justify-between py-3">
          <span className="flex items-center gap-2.5">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden />
            Passkeys
          </span>
          <span className="text-xs font-medium text-muted-foreground">{passkeys}</span>
        </li>
      </ul>
    </Panel>
  );
}
