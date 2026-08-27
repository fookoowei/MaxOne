import { describe, it, expect } from 'vitest';
import { alertSchema } from './alert';

describe('alertSchema', () => {
  it('accepts a valid alert', () => {
    expect(alertSchema.safeParse({ symbol: 'BTC', direction: 'above', targetPrice: '80000' }).success).toBe(true);
  });
  it.each([
    { symbol: 'BTC', direction: 'sideways', targetPrice: '80000' },
    { symbol: 'BTC', direction: 'above', targetPrice: '0' },
    { symbol: '', direction: 'above', targetPrice: '1' },
  ])('rejects %o', (bad) => {
    expect(alertSchema.safeParse(bad).success).toBe(false);
  });
});
