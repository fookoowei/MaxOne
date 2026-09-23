import { describe, expect, it } from 'vitest';
import { initials } from './initials';

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Jane Doe')).toBe('JD');
    expect(initials('Max Foo Koo Wei')).toBe('MF');
    expect(initials('madonna')).toBe('M');
  });
  it('falls back when there is no name', () => {
    expect(initials('')).toBe('ME');
    expect(initials('', '?')).toBe('?');
  });
});
