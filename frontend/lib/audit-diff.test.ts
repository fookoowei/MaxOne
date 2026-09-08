import { describe, expect, it } from 'vitest';
import { diffSnapshots, formatMinorPlain, humanKey } from './audit-diff';

describe('diffSnapshots', () => {
  it('lists changed, added and removed keys; hides unchanged ones', () => {
    expect(diffSnapshots({ status: 'pending', note: 'x', gone: 1 }, { status: 'approved', note: 'x', balanceAfter: 30000 })).toEqual([
      { key: 'status', before: 'pending', after: 'approved', kind: 'changed' },
      { key: 'gone', before: 1, after: undefined, kind: 'removed' },
      { key: 'balanceAfter', before: undefined, after: 30000, kind: 'added' },
    ]);
  });
  it('tolerates non-object snapshots', () => {
    expect(diffSnapshots(null, { a: 1 })).toEqual([{ key: 'a', before: undefined, after: 1, kind: 'added' }]);
  });
});
describe('helpers', () => {
  it('formats minor units without a symbol and humanises keys', () => {
    expect(formatMinorPlain(1250000)).toBe('12,500.00');
    expect(humanKey('balanceAfter')).toBe('balance after');
    expect(humanKey('status_change')).toBe('status change');
  });
});
