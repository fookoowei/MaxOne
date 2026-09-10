import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { NotificationToaster } from '@/components/layout/notification-toaster';
import { AppShell } from '@/components/layout/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  const name = [session.firstName, session.lastName].filter(Boolean).join(' ') || session.email;
  return (
    <AppShell user={{ name, handle: session.handle }}>
      {children}
      {/* The Toaster itself is mounted app-wide in the root layout; this is the socket listener
          that turns push notifications into toasts, and it needs a session. */}
      <NotificationToaster />
    </AppShell>
  );
}
