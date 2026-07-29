import { getSessionUser } from '@/lib/auth/session';
import { roleHasPermission, type Permission } from '@/lib/auth/permissions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// A placeholder for the real screens that arrive in 6b–6d. It double-checks the
// permission itself so that typing a URL directly (e.g. /users as support) still
// shows an access notice rather than the placeholder — the nav hides the link,
// this guards the page. (Real data access is still enforced by NestJS.)
export async function GatedPlaceholder({
  title,
  description,
  permission,
}: {
  title: string;
  description: string;
  permission: Permission;
}) {
  const user = await getSessionUser();
  const allowed = user ? roleHasPermission(user.role, permission) : false;

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Your role lacks permission to view {title}.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-500">
          This screen will be built in a later 6-series milestone.
        </p>
      </CardContent>
    </Card>
  );
}
