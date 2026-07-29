import { getSessionUser } from '@/lib/auth/session';
import { permissionsForRole } from '@/lib/auth/permissions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function DashboardPage() {
  const user = await getSessionUser();
  const permissions = user ? permissionsForRole(user.role) : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500">Signed in as {user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your access</CardTitle>
          <CardDescription>
            Role: <span className="capitalize">{user?.role.replace('_', ' ')}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.length ? (
            <ul className="list-disc pl-5 text-sm">
              {permissions.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No back-office permissions.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
