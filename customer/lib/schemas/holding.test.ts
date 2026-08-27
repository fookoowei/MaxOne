import { describe, it, expect } from 'vitest';
import { holdingSchema } from './holding';

describe('holdingSchema', () => {
  it('accepts a valid holding', () => {
    expect(holdingSchema.safeParse({ symbol: 'BTC', quantity: '0.5', avgCost: '30000' }).success).toBe(true);
  });
  it.each([
    { symbol: 'BTC', quantity: '0', avgCost: '30000' },
    { symbol: 'BTC', quantity: '-1', avgCost: '30000' },
    { symbol: 'BTC', quantity: '0.5', avgCost: 'abc' },
    { symbol: '', quantity: '0.5', avgCost: '1' },
  ])('rejects %o', (bad) => {
    expect(holdingSchema.safeParse(bad).success).toBe(false);
  });
});
