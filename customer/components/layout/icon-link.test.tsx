import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Plus } from 'lucide-react';
import { IconLink } from './icon-link';

describe('IconLink', () => {
  it('is a link named by its label', () => {
    render(<IconLink href="/wallets/new" label="Add a currency" icon={Plus} />);
    expect(screen.getByRole('link', { name: 'Add a currency' })).toHaveAttribute('href', '/wallets/new');
  });
});
