import { describe, it, expect } from 'vitest';
import { walletSchema } from './wallet';

describe('walletSchema', () => {
  it('accepts a supported currency', () => {
    expect(walletSchema.safeParse({ currency: 'EUR' }).success).toBe(true);
  });

  it('rejects an unsupported currency', () => {
    expect(walletSchema.safeParse({ currency: 'JPY' }).success).toBe(false);
    expect(walletSchema.safeParse({ currency: 'ZZZ' }).success).toBe(false);
  });
});
