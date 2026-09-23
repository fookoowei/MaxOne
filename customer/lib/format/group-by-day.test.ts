import { describe, expect, it } from 'vitest';
import { dayLabel, groupByDay } from './group-by-day';

const now = new Date(2026, 8, 23, 15, 0, 0); // Sep 23 2026, 15:00 local

describe('dayLabel', () => {
  it('names today and yesterday, then falls back to a short date', () => {
    expect(dayLabel(new Date(2026, 8, 23, 1, 0).toISOString(), now)).toBe('Today');
    expect(dayLabel(new Date(2026, 8, 22, 23, 59).toISOString(), now)).toBe('Yesterday');
    expect(dayLabel(new Date(2026, 8, 20, 12, 0).toISOString(), now)).toBe('Sep 20');
    expect(dayLabel(new Date(2025, 11, 31, 12, 0).toISOString(), now)).toBe('Dec 31, 2025');
  });
});

describe('groupByDay', () => {
  it('groups consecutive rows under one label and keeps order', () => {
    const rows = [
      { id: 'a', createdAt: new Date(2026, 8, 23, 10).toISOString() },
      { id: 'b', createdAt: new Date(2026, 8, 23, 9).toISOString() },
      { id: 'c', createdAt: new Date(2026, 8, 22, 9).toISOString() },
    ];
    expect(groupByDay(rows, now)).toEqual([
      { label: 'Today', items: [rows[0], rows[1]] },
      { label: 'Yesterday', items: [rows[2]] },
    ]);
  });

  it('returns nothing for no rows', () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});
