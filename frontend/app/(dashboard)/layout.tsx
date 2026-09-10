import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { serverApi } from '@/lib/api/server';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { PageBar } from '@/components/shell/page-bar';

// The shell every console page shares: sidebar (full / rail / sheet), page bar, content column.
// Identity comes from the cookie mirror (no /me call); the pending count for the Approvals badge
// is one extra read for roles that can see the queue. The proxy already blocks logged-out users.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  let pendingCount = 0;
  if (roleHasPermission(user.role, 'transaction.view_all')) {
    const res = await serverApi('/admin/overview').catch(() => null);
    if (res?.ok) pendingCount = ((await res.json()) as { pending: { count: number } }).pending.count;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} pendingCount={pendingCount} />
      <SidebarInset>
        <PageBar />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
