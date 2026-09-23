import { describe, it, expect } from 'vitest';
import { formatChangePct, formatCompactPrice, formatPrice } from './price';

describe('formatPrice', () => {
  it('formats a normal price with 2 decimals', () => {
    expect(formatPrice(43000.5)).toBe('$43,000.50');
  });

  it('uses extra decimals for sub-$1 assets', () => {
    expect(formatPrice(0.1234)).toBe('$0.1234');
  });
});

describe('formatCompactPrice', () => {
  it('compacts a trillion-scale market cap so it fits its column', () => {
    expect(formatCompactPrice(1_553_556_542_102.4)).toBe('$1.55T');
    expect(formatCompactPrice(308_700_000_000)).toBe('$308.7B');
  });

  it('shows a dash when the cap is unknown (supply provider failed)', () => {
    expect(formatCompactPrice(0)).toBe('—');
  });
});

describe('formatChangePct', () => {
  it('signs and fixes to two decimals everywhere', () => {
    expect(formatChangePct(3.842)).toBe('+3.84%');
    expect(formatChangePct(-1.1)).toBe('-1.10%');
    expect(formatChangePct(0)).toBe('+0.00%');
  });
});
