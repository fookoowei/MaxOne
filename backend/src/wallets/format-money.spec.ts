import { formatMinor } from './format-money';

describe('formatMinor', () => {
  it('formats known-symbol currencies', () => {
    expect(formatMinor(5000, 'USD')).toBe('$50.00');
    expect(formatMinor(0, 'USD')).toBe('$0.00');
    expect(formatMinor(12345, 'EUR')).toBe('€123.45');
  });
  it('falls back to code for others', () => {
    expect(formatMinor(5000, 'SGD')).toBe('50.00 SGD');
  });
});
