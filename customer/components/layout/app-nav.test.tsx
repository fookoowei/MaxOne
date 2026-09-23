import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/markets' }));

import { AppNav } from './app-nav';

describe('AppNav (one nav, three shapes)', () => {
  it('renders tabs, rail and sidebar with the same four destinations and the same active item', () => {
    render(<AppNav user={{ name: 'Jane Doe', handle: 'janedoe' }} />);
    const navs = screen.getAllByRole('navigation', { name: 'Primary' });
    expect(navs.map((n) => n.dataset.shape)).toEqual(['tabs', 'rail', 'sidebar']);
    for (const nav of navs) {
      const links = Array.from(nav.querySelectorAll('a[href="/markets"]'));
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('aria-current', 'page');
      expect(nav.querySelector('a[href="/pay"]')).not.toHaveAttribute('aria-current');
    }
  });
  it('the sidebar shows who is signed in', () => {
    render(<AppNav user={{ name: 'Jane Doe', handle: 'janedoe' }} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.getByText('@janedoe')).toBeInTheDocument();
  });
});

describe('AppNav (scan shortcut)', () => {
  it('raises Scan to pay in the middle of the phone tabs only', () => {
    render(<AppNav user={{ name: 'Jane Doe' }} />);
    const [tabs, rail, sidebar] = screen.getAllByRole('navigation', { name: 'Primary' });
    const scan = tabs.querySelector('a[href="/pay/scan"]');
    expect(scan).toHaveAccessibleName('Scan to pay');
    const links = Array.from(tabs.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/', '/pay', '/pay/scan', '/markets', '/profile']);
    expect(rail.querySelector('a[href="/pay/scan"]')).toBeNull();
    expect(sidebar.querySelector('a[href="/pay/scan"]')).toBeNull();
  });
});
