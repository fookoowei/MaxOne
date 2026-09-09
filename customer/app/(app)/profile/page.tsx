import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { getSessionUser } from '@/lib/auth/session';
import { TwoFactorSetup } from '@/components/security/two-factor-setup';
import { PasskeyManager, type PasskeySummary } from '@/components/security/passkey-manager';
import { ThemeToggle } from '@/components/theme-toggle';
import { SignOutButton } from '@/components/sign-out-button';
import { PageHeader } from '@/components/layout/page-header';

export default async function ProfilePage() {
  const session = await getSessionUser();
  const statusRes = await serverApi('/auth/2fa/status');
  if (statusRes.status === 401) redirect('/login');
  const { enabled } = statusRes.ok ? ((await statusRes.json()) as { enabled: boolean }) : { enabled: false };
  const pkRes = await serverApi('/auth/passkeys');
  const passkeys = pkRes.ok ? ((await pkRes.json()) as PasskeySummary[]) : [];

  return (
    <div className="space-y-6 lg:max-w-[720px]">
      <PageHeader
        title="Profile"
        description={`${session?.firstName ?? ''} ${session?.lastName ?? ''}`.trim() + (session?.handle ? ` · @${session.handle}` : '') + (session?.email ? ` · ${session.email}` : '')}
      />

      <section className="space-y-3 rounded-[20px] border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="text-xs text-muted-foreground">Follow your device, or pick one.</p>
        </div>
        <ThemeToggle />
      </section>

      <section className="space-y-3 rounded-[20px] border bg-card p-4">
        <h2 className="text-sm font-semibold">Security</h2>
        <p className="text-xs text-muted-foreground">
          Two-factor authentication adds a 6-digit code from your phone to every login.
        </p>
        <TwoFactorSetup initialEnabled={enabled} />
      </section>

      <section className="space-y-3 rounded-[20px] border bg-card p-4">
        <h2 className="text-sm font-semibold">Passkeys</h2>
        <p className="text-xs text-muted-foreground">
          Sign in with Face ID, Touch ID or Windows Hello — no password. We only ever store a public key.
        </p>
        <PasskeyManager initial={passkeys} />
      </section>

      <section className="space-y-3 rounded-[20px] border bg-card p-4">
        <h2 className="text-sm font-semibold">Account</h2>
        <p className="text-xs text-muted-foreground">
          Signs you out on this device only — other devices keep their own session.
        </p>
        <SignOutButton />
      </section>
    </div>
  );
}
