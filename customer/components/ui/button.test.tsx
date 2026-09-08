import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button pending', () => {
  it('is disabled, marked busy, and shows a spinner while pending — label stays visible', () => {
    render(<Button pending>Save changes</Button>);
    const btn = screen.getByRole('button', { name: /save changes/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status', { name: 'Working' })).toBeInTheDocument();
  });

  it('is a plain button when not pending', () => {
    render(<Button>Save changes</Button>);
    const btn = screen.getByRole('button', { name: /save changes/i });
    expect(btn).toBeEnabled();
    expect(btn).not.toHaveAttribute('aria-busy');
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('Button size="xl" (touch CTA)', () => {
  it('is 44px tall', () => {
    render(<Button size="xl">Continue</Button>);
    expect(screen.getByRole('button', { name: 'Continue' }).className).toMatch(/h-11/);
  });
});
