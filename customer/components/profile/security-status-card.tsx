import { KeyRound, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Desktop aside on Profile: the two security facts that matter, as a status list.
export function SecurityStatusCard({ twoFactorEnabled, passkeyCount }: { twoFactorEnabled: boolean; passkeyCount: number }) {
  const passkeys = passkeyCount === 0 ? 'None yet' : passkeyCount === 1 ? '1 passkey' : `${passkeyCount} passkeys`;
  return (
    <section className="rounded-[20px] border bg-card p-4">
      <h2 className="text-sm font-semibold">Security</h2>
      <ul className="mt-1 divide-y text-sm">
        <li className="flex items-center justify-between py-3">
          <span className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
            Two-factor authentication
          </span>
          <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-xs font-medium', twoFactorEnabled ? 'bg-status-approved/12 text-status-approved' : 'bg-muted text-muted-foreground')}>
            {twoFactorEnabled ? 'On' : 'Off'}
          </span>
        </li>
        <li className="flex items-center justify-between py-3">
          <span className="flex items-center gap-2.5">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden />
            Passkeys
          </span>
          <span className="text-xs font-medium text-muted-foreground">{passkeys}</span>
        </li>
      </ul>
    </section>
  );
}
