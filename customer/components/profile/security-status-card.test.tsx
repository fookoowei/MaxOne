import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SecurityStatusCard } from './security-status-card';

describe('SecurityStatusCard', () => {
  it('shows two-factor On and pluralises passkeys', () => {
    render(<SecurityStatusCard twoFactorEnabled passkeyCount={2} />);
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('2 passkeys')).toBeInTheDocument();
  });

  it('shows two-factor Off and "None yet" with no passkeys', () => {
    render(<SecurityStatusCard twoFactorEnabled={false} passkeyCount={0} />);
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('None yet')).toBeInTheDocument();
  });

  it('uses the singular for one passkey', () => {
    render(<SecurityStatusCard twoFactorEnabled={false} passkeyCount={1} />);
    expect(screen.getByText('1 passkey')).toBeInTheDocument();
  });
});
