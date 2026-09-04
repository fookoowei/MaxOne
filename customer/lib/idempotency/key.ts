'use client';

import { useCallback, useEffect, useRef } from 'react';

function uuid(): string {
  const c = globalThis.crypto as Crypto & { randomUUID?: () => string };
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  // Fallback v4 from getRandomValues (older jsdom/browsers).
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x: number) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// One Idempotency-Key per LOGICAL money operation: minted on first use, REUSED across a
// failed/retried submit of the same operation (so a retry can never double-charge), and
// cleared after success so the next submit is a new operation. Pass the inputs that DEFINE
// the operation (amount, recipient…): if the user edits any of them, that's a new intent →
// the key is dropped and the next submit mints a fresh one. An unchanged retry keeps it.
export function useIdempotencyKey(deps: unknown[] = []) {
  const ref = useRef<string | null>(null);
  const inputs = JSON.stringify(deps);
  useEffect(() => {
    ref.current = null; // inputs changed (or first mount) → next submit is a new operation
  }, [inputs]);
  const key = useCallback(() => (ref.current ??= uuid()), []);
  const reset = useCallback(() => {
    ref.current = null;
  }, []);
  return { key, reset };
}
