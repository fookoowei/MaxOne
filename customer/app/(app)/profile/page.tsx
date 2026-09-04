import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { getSessionUser } from '@/lib/auth/session';
import { TwoFactorSetup } from '@/components/two-factor-setup';

export default async function ProfilePage() {
  const session = await getSessionUser();
  const statusRes = await serverApi('/auth/2fa/status');
  if (statusRes.status === 401) redirect('/login');
  const { enabled } = statusRes.ok ? ((await statusRes.json()) as { enabled: boolean }) : { enabled: false };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          {session?.firstName} {session?.lastName}
          {session?.handle ? ` · @${session.handle}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{session?.email}</p>
      </header>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Security</h2>
        <p className="text-xs text-muted-foreground">
          Two-factor authentication adds a 6-digit code from your phone to every login.
        </p>
        <TwoFactorSetup initialEnabled={enabled} />
      </section>
    </div>
  );
}
