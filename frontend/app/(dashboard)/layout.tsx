import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { Nav } from '@/components/nav';
import { Topbar } from '@/components/topbar';

// The shell every dashboard page shares. It reads the identity mirror server-
// side (no /me call during render) and renders the role-aware nav + topbar.
// The proxy already blocks logged-out users; the redirect here is belt-and-
// suspenders in case this layout is ever reached without a session.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-full flex-col">
      <Topbar user={user} />
      <div className="flex flex-1">
        <aside className="w-56 shrink-0 border-r">
          <Nav role={user.role} />
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
