import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletList } from './wallet-list';

describe('WalletList', () => {
  it('renders each wallet with its formatted balance', () => {
    render(
      <WalletList
        wallets={[
          { id: 'w1', currency: 'USD', balance: 5000 },
          { id: 'w2', currency: 'EUR', balance: 4389 },
        ]}
      />,
    );
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('€43.89')).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
  });
});
