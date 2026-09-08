import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuickActions } from './quick-actions';

describe('QuickActions', () => {
  it('links the four money actions', () => {
    render(<QuickActions />);
    expect(screen.getByRole('link', { name: /add money/i })).toHaveAttribute('href', '/deposit');
    expect(screen.getByRole('link', { name: /withdraw/i })).toHaveAttribute('href', '/withdraw');
    expect(screen.getByRole('link', { name: /send/i })).toHaveAttribute('href', '/pay/send');
    expect(screen.getByRole('link', { name: /convert/i })).toHaveAttribute('href', '/convert');
  });
});
