import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardLink } from './card-link';

describe('CardLink', () => {
  it('is a link named by its text, pointing where it says', () => {
    render(<CardLink href="/portfolio">Open</CardLink>);
    const link = screen.getByRole('link', { name: 'Open' });
    expect(link).toHaveAttribute('href', '/portfolio');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
