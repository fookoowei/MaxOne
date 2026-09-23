import { describe, expect, it } from 'vitest';
import { currencyFlag, currencyName } from './currencies';

describe('currencyFlag', () => {
  it('maps a currency to its region flag', () => {
    expect(currencyFlag('USD')).toBe('🇺🇸');
    expect(currencyFlag('EUR')).toBe('🇪🇺');
    expect(currencyFlag('SGD')).toBe('🇸🇬');
  });
  it('falls back to the first two letters for an unknown code', () => {
    expect(currencyFlag('NOK')).toBe('🇳🇴');
  });
});

describe('currencyName', () => {
  it('spells out a known code and echoes an unknown one', () => {
    expect(currencyName('GBP')).toBe('British Pound');
    expect(currencyName('XYZ')).toBe('XYZ');
  });
});
