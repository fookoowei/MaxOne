import { GatedPlaceholder } from '@/components/gated-placeholder';

export default function UsersPage() {
  return (
    <GatedPlaceholder
      title="Users"
      description="Manage staff accounts, roles, and status."
      permission="user.manage"
    />
  );
}
