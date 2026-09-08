import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/approvals', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

beforeAll(() => {
  // the sidebar's mobile detection
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
});

const user = { id: 'u1', email: 'finance@wallet.local', role: 'finance' };

describe('AppSidebar', () => {
  it('renders the role\'s groups and marks the current section active', () => {
    render(<SidebarProvider><AppSidebar user={user} pendingCount={0} /></SidebarProvider>);
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.queryByText('Administration')).toBeNull();
    expect(screen.getByRole('link', { name: /approvals/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /wallets/i })).not.toHaveAttribute('aria-current');
  });

  it('shows the live pending count on Approvals, and nothing when the queue is empty', () => {
    const { rerender } = render(<SidebarProvider><AppSidebar user={user} pendingCount={4} /></SidebarProvider>);
    expect(screen.getByLabelText('4 pending')).toHaveTextContent('4');
    rerender(<SidebarProvider><AppSidebar user={user} pendingCount={0} /></SidebarProvider>);
    expect(screen.queryByLabelText(/pending/)).toBeNull();
  });

  it('footer shows who is signed in', () => {
    render(<SidebarProvider><AppSidebar user={user} /></SidebarProvider>);
    expect(screen.getAllByText('finance@wallet.local').length).toBeGreaterThan(0);
    expect(screen.getByText('FI')).toBeInTheDocument();
  });
});
