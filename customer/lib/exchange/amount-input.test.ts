import { describe, expect, it } from 'vitest';
import { applyKey, formatTyped } from './amount-input';

describe('applyKey', () => {
  it('appends digits and deletes with back', () => {
    expect(applyKey('', '2')).toBe('2');
    expect(applyKey('2', '0')).toBe('20');
    expect(applyKey('20', 'back')).toBe('2');
    expect(applyKey('', 'back')).toBe('');
  });

  it('never produces a leading zero', () => {
    expect(applyKey('0', '5')).toBe('5');
    expect(applyKey('0', '0')).toBe('0');
    expect(applyKey('', '0')).toBe('0');
  });

  it('allows one decimal point and at most two decimals', () => {
    expect(applyKey('', '.')).toBe('0.');
    expect(applyKey('12', '.')).toBe('12.');
    expect(applyKey('12.', '.')).toBe('12.');
    expect(applyKey('12.5', '0')).toBe('12.50');
    expect(applyKey('12.50', '1')).toBe('12.50');
  });

  it('caps the whole part so the amount always fits on screen', () => {
    expect(applyKey('999999999', '1')).toBe('999999999');
    expect(applyKey('999999999', '.')).toBe('999999999.');
  });
});

describe('formatTyped', () => {
  it('groups thousands but keeps the typed decimals intact', () => {
    expect(formatTyped('')).toBe('');
    expect(formatTyped('2000')).toBe('2,000');
    expect(formatTyped('2000.')).toBe('2,000.');
    expect(formatTyped('2000.5')).toBe('2,000.5');
    expect(formatTyped('0.50')).toBe('0.50');
  });
});
