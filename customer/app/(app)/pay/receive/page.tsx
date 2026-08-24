import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { ReceiveQr } from '@/components/receive-qr';

export default async function ReceivePage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  // handle is carried in the session (enriched at login/register).
  const handle = session.handle ?? session.email.split('@')[0];

  return (
    <div className="space-y-6">
      <header>
        <Link href="/pay" className="text-sm text-muted-foreground">
          ← Back
        </Link>
      </header>
      <ReceiveQr handle={handle} />
    </div>
  );
}
