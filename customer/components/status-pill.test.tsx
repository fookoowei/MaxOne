import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from './status-pill';

describe('StatusPill', () => {
  it('colours by tone and stays quiet by default', () => {
    render(
      <>
        <StatusPill tone="pending">Pending review</StatusPill>
        <StatusPill>Watching</StatusPill>
      </>,
    );
    expect(screen.getByText('Pending review')).toHaveClass('text-status-pending', 'bg-status-pending/12');
    expect(screen.getByText('Watching')).toHaveClass('text-muted-foreground', 'bg-muted');
  });
});
