import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    ['pending', 'text-status-pending'],
    ['approved', 'text-status-approved'],
    ['rejected', 'text-status-rejected'],
  ])('%s → its state colour', (status, cls) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status)).toHaveClass(cls);
  });
  it('an unknown status is quiet (no state colour)', () => {
    render(<StatusBadge status="archived" />);
    expect(screen.getByText('archived').className).not.toMatch(/text-status-/);
  });
});
