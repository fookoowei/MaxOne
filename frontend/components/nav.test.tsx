import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// usePathname is only used for active-link highlighting; a fixed value is fine.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

import { Nav } from './nav';

describe('Nav (role-aware links)', () => {
  it('shows every link for super_admin', () => {
    render(<Nav role="super_admin" />);
    for (const label of ['Dashboard', 'Approvals', 'Wallets', 'Users', 'Audit']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('shows finance Dashboard, Approvals, Wallets — but not Users or Audit', () => {
    render(<Nav role="finance" />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Approvals' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wallets' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Audit' })).toBeNull();
  });

  it('shows support only Dashboard and Wallets', () => {
    render(<Nav role="support" />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wallets' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Approvals' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Users' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Audit' })).toBeNull();
  });

  it('shows admin Wallets, Users, Audit — but not Approvals', () => {
    render(<Nav role="admin" />);
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wallets' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Approvals' })).toBeNull();
  });

  it('shows a plain user only Dashboard', () => {
    render(<Nav role="user" />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Wallets' })).toBeNull();
  });
});
