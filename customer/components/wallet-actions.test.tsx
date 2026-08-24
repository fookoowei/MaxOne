import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletActions } from './wallet-actions';

describe('WalletActions', () => {
  it('links to the deposit and withdraw pages', () => {
    render(<WalletActions />);
    expect(screen.getByRole('link', { name: /add money/i })).toHaveAttribute('href', '/deposit');
    expect(screen.getByRole('link', { name: /withdraw/i })).toHaveAttribute('href', '/withdraw');
  });
});
