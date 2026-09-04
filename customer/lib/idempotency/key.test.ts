import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIdempotencyKey } from './key';

describe('useIdempotencyKey', () => {
  it('returns the same key until reset, then a new one', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const a = result.current.key();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.current.key()).toBe(a); // retry of the same operation → same key
    result.current.reset();
    expect(result.current.key()).not.toBe(a); // next operation → fresh key
  });

  it('keeps the key while the inputs are unchanged, drops it when they change', () => {
    const { result, rerender } = renderHook(({ d }) => useIdempotencyKey(d), { initialProps: { d: [50, 'alice'] } });
    const a = result.current.key();
    rerender({ d: [50, 'alice'] }); // same inputs (a retry) → same key
    expect(result.current.key()).toBe(a);
    rerender({ d: [70, 'alice'] }); // amount edited → new intent → new key
    expect(result.current.key()).not.toBe(a);
  });
});
