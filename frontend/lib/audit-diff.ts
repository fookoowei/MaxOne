// An audit row stores two JSON snapshots. People read changes, not JSON: one line per key that
// differs, "before → after", with money keys shown as amounts.
export interface DiffRow {
  key: string;
  before: unknown;
  after: unknown;
  kind: 'changed' | 'added' | 'removed';
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function diffSnapshots(oldValue: unknown, newValue: unknown): DiffRow[] {
  const a = isObj(oldValue) ? oldValue : {};
  const b = isObj(newValue) ? newValue : {};
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  const rows: DiffRow[] = [];
  for (const key of keys) {
    const inA = key in a;
    const inB = key in b;
    if (inA && inB) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) rows.push({ key, before: a[key], after: b[key], kind: 'changed' });
    } else if (inB) rows.push({ key, before: undefined, after: b[key], kind: 'added' });
    else rows.push({ key, before: a[key], after: undefined, kind: 'removed' });
  }
  return rows;
}

export const MONEY_KEYS = new Set(['amount', 'balance', 'balanceBefore', 'balanceAfter', 'credit']);

/** Minor units → "1,250.00" (no symbol: an audit row doesn't carry its currency). */
export function formatMinorPlain(minor: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100);
}

export function humanKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase();
}
