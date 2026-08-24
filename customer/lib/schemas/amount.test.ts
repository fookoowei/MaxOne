import { describe, it, expect } from 'vitest';
import { amountSchema } from './amount';

describe('amountSchema', () => {
  it('accepts a valid amount', () => {
    expect(amountSchema.safeParse({ amount: '50.00' }).success).toBe(true);
    expect(amountSchema.safeParse({ amount: '50.00', note: 'rent' }).success).toBe(true);
  });

  it.each(['', '0', '-5', '1.234', 'abc'])('rejects "%s"', (bad) => {
    expect(amountSchema.safeParse({ amount: bad }).success).toBe(false);
  });
});
