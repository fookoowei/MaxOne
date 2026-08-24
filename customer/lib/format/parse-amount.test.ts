import { describe, it, expect } from 'vitest';
import { parseAmountToMinor } from './parse-amount';

describe('parseAmountToMinor', () => {
  it.each([
    ['50', 5000],
    ['50.5', 5050],
    ['50.55', 5055],
    ['0.01', 1],
    ['1000', 100000],
    ['50.00', 5000],
  ])('parses "%s" to %d cents', (input, expected) => {
    expect(parseAmountToMinor(input)).toBe(expected);
  });

  it.each(['', '0', '0.00', '-5', '1.234', 'abc', '5.', '.5', ' '])(
    'returns NaN for invalid input "%s"',
    (bad) => {
      expect(Number.isNaN(parseAmountToMinor(bad))).toBe(true);
    },
  );
});
