import { describe, expect, it } from 'vitest';
import { sanitizeAmount } from './amount-input';

describe('sanitizeAmount', () => {
  it('keeps a plain amount', () => {
    expect(sanitizeAmount('2000')).toBe('2000');
    expect(sanitizeAmount('12.5')).toBe('12.5');
  });
  it('drops anything that is not part of an amount', () => {
    expect(sanitizeAmount('1,000')).toBe('1000');
    expect(sanitizeAmount('abc1x')).toBe('1');
    expect(sanitizeAmount('-5')).toBe('5');
  });
  it('never produces a leading zero', () => {
    expect(sanitizeAmount('05')).toBe('5');
    expect(sanitizeAmount('00')).toBe('0');
    expect(sanitizeAmount('0.50')).toBe('0.50');
  });
  it('allows one decimal point and at most two decimals', () => {
    expect(sanitizeAmount('.')).toBe('0.');
    expect(sanitizeAmount('..5')).toBe('0.5');
    expect(sanitizeAmount('12.345')).toBe('12.34');
    expect(sanitizeAmount('1.2.3')).toBe('1.23');
  });
  it('caps the whole part so the amount always fits on screen', () => {
    expect(sanitizeAmount('9999999999')).toBe('999999999');
  });
});
