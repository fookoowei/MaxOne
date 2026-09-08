import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { Toaster } from '@/components/ui/sonner';
import { NotificationToaster } from '@/components/layout/notification-toaster';
import { AppShell } from '@/components/layout/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const name = [session.firstName, session.lastName].filter(Boolean).join(' ') || session.email;
  return (
    <AppShell user={{ name, handle: session.handle }}>
      {children}
      <Toaster position="top-center" richColors closeButton />
      <NotificationToaster />
    </AppShell>
  );
}
