import { describe, it, expect } from 'vitest';
import { permissionsForRole, roleHasPermission } from './permissions';

describe('permissions map', () => {
  it('gives super_admin every permission', () => {
    expect(permissionsForRole('super_admin')).toHaveLength(6);
    expect(roleHasPermission('super_admin', 'audit.view')).toBe(true);
  });
  it('gives finance approvals + adjust but not user.manage', () => {
    expect(roleHasPermission('finance', 'deposit.approve')).toBe(true);
    expect(roleHasPermission('finance', 'wallet.adjust')).toBe(true);
    expect(roleHasPermission('finance', 'user.manage')).toBe(false);
  });
  it('gives support only read', () => {
    expect(permissionsForRole('support')).toEqual(['transaction.view_all']);
  });
  it('gives a plain user nothing, and unknown roles nothing', () => {
    expect(permissionsForRole('user')).toEqual([]);
    expect(permissionsForRole('nope')).toEqual([]);
  });
});
