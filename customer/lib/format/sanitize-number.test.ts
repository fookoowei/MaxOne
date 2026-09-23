import { describe, expect, it, vi } from 'vitest';
import type { ChangeEvent } from 'react';
import { sanitizeAmount, sanitizeDecimal, sanitizeDigits, sanitizePrice, sanitizeQuantity, withSanitizer } from './sanitize-number';

describe('sanitizeAmount (money, 2 decimals)', () => {
  it('keeps a plain amount', () => {
    expect(sanitizeAmount('2000')).toBe('2000');
    expect(sanitizeAmount('12.5')).toBe('12.5');
  });
  it('drops anything that is not part of an amount', () => {
    expect(sanitizeAmount('1,000')).toBe('1000');
    expect(sanitizeAmount('$1a2x')).toBe('12');
    expect(sanitizeAmount('-5')).toBe('5');
    expect(sanitizeAmount('1e5')).toBe('15');
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
    expect(sanitizeAmount('9999999999.99')).toBe('999999999.99');
  });
});

describe('sanitizePrice / sanitizeQuantity / sanitizeDecimal', () => {
  it('prices keep four decimals for sub-dollar assets', () => {
    expect(sanitizePrice('0.12345')).toBe('0.1234');
  });
  it('quantities keep eight decimals', () => {
    expect(sanitizeQuantity('0.000000019')).toBe('0.00000001');
  });
  it('zero decimals means the point is refused', () => {
    expect(sanitizeDecimal('12.5', { maxWhole: 3, maxDecimals: 0 })).toBe('125');
  });
});

describe('sanitizeDigits', () => {
  it('keeps digits only, capped', () => {
    expect(sanitizeDigits('12a3 456 7', 6)).toBe('123456');
    expect(sanitizeDigits('', 6)).toBe('');
  });
});

describe('withSanitizer', () => {
  it('cleans the DOM value before the form sees it', () => {
    const onChange = vi.fn();
    const field = withSanitizer({ name: 'amount', onChange }, sanitizeAmount);
    const target = { value: '1,2a.345' } as HTMLInputElement;
    field.onChange({ target } as ChangeEvent<HTMLInputElement>);
    expect(target.value).toBe('12.34');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target }));
  });
});
