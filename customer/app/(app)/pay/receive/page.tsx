import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/layout/page-header';
import { ReceiveQr } from '@/components/pay/receive-qr';

export default async function ReceivePage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  // handle is carried in the session (enriched at login/register).
  const handle = session.handle ?? session.email.split('@')[0];
  return (
    <div className="space-y-6 lg:max-w-[560px]">
      <PageHeader title="Receive" description="Let someone scan this to pay you." back={{ href: '/pay', label: 'Pay' }} />
      <ReceiveQr handle={handle} />
    </div>
  );
}
