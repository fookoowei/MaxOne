export type Permission =
  | 'deposit.approve'
  | 'withdrawal.approve'
  | 'wallet.adjust'
  | 'user.manage'
  | 'audit.view'
  | 'transaction.view_all';

const ALL: Permission[] = [
  'deposit.approve',
  'withdrawal.approve',
  'wallet.adjust',
  'user.manage',
  'audit.view',
  'transaction.view_all',
];

// Mirrors backend/prisma/seed.ts ROLE_PERMISSIONS. UX-only: the API still enforces.
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: ALL,
  admin: ['user.manage', 'transaction.view_all', 'audit.view'],
  finance: ['deposit.approve', 'withdrawal.approve', 'wallet.adjust', 'transaction.view_all'],
  support: ['transaction.view_all'],
  user: [],
};

export function permissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: string, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
