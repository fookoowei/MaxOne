import { describe, it, expect } from 'vitest';
import { encodeQr, parseQr } from './payload';

describe('QR payload', () => {
  it('encodes a handle as a maxone payload', () => {
    expect(encodeQr('alice')).toBe('maxone:alice');
  });

  it('round-trips', () => {
    expect(parseQr(encodeQr('bob_99'))).toBe('bob_99');
  });

  it('returns null for non-MaxOne text', () => {
    expect(parseQr('https://example.com')).toBeNull();
    expect(parseQr('alice')).toBeNull();
    expect(parseQr('maxone:BAD HANDLE')).toBeNull();
  });
});
