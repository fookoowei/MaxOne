import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel } from './panel';

describe('Panel', () => {
  it('renders a list card with a header row', () => {
    render(
      <Panel title="Transactions" action={<a href="/activity">See all</a>}>
        <ul />
      </Panel>,
    );
    const h = screen.getByRole('heading', { level: 2, name: 'Transactions' });
    expect(h.parentElement).toHaveClass('py-3');
    expect(h.closest('section')).toHaveClass('rounded-[20px]', 'border', 'bg-card', 'px-4', 'pb-1', 'pt-1');
    expect(screen.getByRole('link', { name: 'See all' })).toBeInTheDocument();
  });
  it('renders a padded card with no header when there is no title', () => {
    render(<Panel padded aria-label="x">hello</Panel>);
    expect(screen.getByLabelText('x')).toHaveClass('p-4');
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
