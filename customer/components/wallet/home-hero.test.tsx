import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeHero } from './home-hero';

// The live socket is an enhancement; the hero renders the SSR balance without it.
vi.mock('./live-balance', () => ({
  LiveBalance: ({ initialBalance, currency }: { initialBalance: number; currency: string }) => (
    <p>
      {currency} {initialBalance}
    </p>
  ),
}));

describe('HomeHero', () => {
  it('greets by name, shows the balance and handle, and links the two main actions', () => {
    render(<HomeHero greeting="Good morning" name="Jane Doe" handle="janedoe" wallet={{ id: 'w1', currency: 'USD', balance: 5689330 }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('Good morning!')).toBeInTheDocument();
    expect(screen.getByText('USD 5689330')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy your handle @janedoe/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /deposit/i })).toHaveAttribute('href', '/deposit');
    expect(screen.getByRole('link', { name: /send money/i })).toHaveAttribute('href', '/pay/send');
    expect(screen.getByRole('link', { name: /price alerts/i })).toHaveAttribute('href', '/alerts');
  });

  it('says so when there is no wallet, and hides the handle when there is none', () => {
    render(<HomeHero greeting="Good evening" name="Jane Doe" />);
    expect(screen.getByText(/no wallet found/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy your handle/i })).toBeNull();
  });
});
