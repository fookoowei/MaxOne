import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array } from './subscribe';

describe('urlBase64ToUint8Array', () => {
  it('decodes a base64url VAPID key to bytes', () => {
    const out = urlBase64ToUint8Array('SGVsbG8'); // "Hello" (base64url, no padding)
    expect(Array.from(out)).toEqual([72, 101, 108, 108, 111]);
  });

  it('handles base64url chars (- and _) and missing padding', () => {
    // 0xFB 0xFF 0xBF encodes to "-_-_" in standard base64 → base64url "-_-_"
    const out = urlBase64ToUint8Array('-_-_');
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBe(3);
  });
});
