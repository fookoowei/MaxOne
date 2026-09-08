import { describe, expect, it } from 'vitest';
import { isActivePath, navGroupsForRole } from './nav';

const labels = (role: string) => navGroupsForRole(role).flatMap((g) => g.items.map((i) => i.label));

describe('navGroupsForRole (role-aware console map)', () => {
  it('super_admin sees everything, grouped', () => {
    const groups = navGroupsForRole('super_admin');
    expect(groups.map((g) => g.label)).toEqual(['Overview', 'Operations', 'Administration']);
    expect(labels('super_admin')).toEqual(['Dashboard', 'Approvals', 'Wallets', 'Users', 'Audit']);
  });
  it('finance: Dashboard, Approvals, Wallets — no Administration group at all', () => {
    expect(labels('finance')).toEqual(['Dashboard', 'Approvals', 'Wallets']);
    expect(navGroupsForRole('finance').some((g) => g.label === 'Administration')).toBe(false);
  });
  it('support: Dashboard and Wallets only', () => expect(labels('support')).toEqual(['Dashboard', 'Wallets']));
  it('admin: Wallets, Users, Audit — no Approvals', () => expect(labels('admin')).toEqual(['Dashboard', 'Wallets', 'Users', 'Audit']));
  it('plain user: Dashboard only', () => expect(labels('user')).toEqual(['Dashboard']));
});

describe('isActivePath', () => {
  it('root matches only root; sections match their subpaths', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/', '/wallets')).toBe(false);
    expect(isActivePath('/wallets', '/wallets/abc')).toBe(true);
  });
});
