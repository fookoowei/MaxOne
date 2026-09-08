import { describe, expect, it } from 'vitest';
import { relativeTime } from './relative-time';

const now = new Date('2026-09-08T12:00:00Z');
describe('relativeTime', () => {
  it.each([
    ['2026-09-08T11:59:40Z', 'just now'],
    ['2026-09-08T11:35:00Z', '25m ago'],
    ['2026-09-08T09:00:00Z', '3h ago'],
    ['2026-09-05T12:00:00Z', '3d ago'],
  ])('%s → %s', (iso, out) => expect(relativeTime(iso, now)).toBe(out));
  it('falls back to a date after a month', () => expect(relativeTime('2026-06-01T00:00:00Z', now)).toMatch(/2026/));
});
