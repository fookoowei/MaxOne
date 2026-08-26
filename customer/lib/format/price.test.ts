import { describe, it, expect } from 'vitest';
import { formatPrice } from './price';

describe('formatPrice', () => {
  it('formats a normal price with 2 decimals', () => {
    expect(formatPrice(43000.5)).toBe('$43,000.50');
  });

  it('uses extra decimals for sub-$1 assets', () => {
    expect(formatPrice(0.1234)).toBe('$0.1234');
  });
});
