import { describe, it, expect } from 'vitest';
import { formatMoney } from './money';

describe('formatMoney', () => {
  it('formats USD minor units as dollars', () => {
    expect(formatMoney(5000, 'USD')).toBe('$50.00');
  });
  it('formats zero', () => {
    expect(formatMoney(0, 'USD')).toBe('$0.00');
  });
  it('respects the currency code', () => {
    expect(formatMoney(5000, 'EUR')).toContain('50.00');
  });
});
