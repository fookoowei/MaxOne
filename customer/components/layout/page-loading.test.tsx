import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageLoading } from './page-loading';

describe('PageLoading', () => {
  it('announces one centred loading status', () => {
    render(<PageLoading />);
    expect(screen.getByRole('status', { name: 'Loading page' })).toBeInTheDocument();
  });
});
