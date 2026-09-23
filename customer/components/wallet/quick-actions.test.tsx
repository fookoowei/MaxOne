import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuickActions } from './quick-actions';

describe('QuickActions', () => {
  it('links the four money actions', () => {
    render(<QuickActions />);
    expect(screen.getByRole('link', { name: /deposit/i })).toHaveAttribute('href', '/deposit');
    expect(screen.getByRole('link', { name: /send/i })).toHaveAttribute('href', '/pay/send');
    expect(screen.getByRole('link', { name: /exchange/i })).toHaveAttribute('href', '/convert');
    expect(screen.getByRole('link', { name: /withdraw/i })).toHaveAttribute('href', '/withdraw');
  });
});
