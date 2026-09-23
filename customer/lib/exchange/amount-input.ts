// The on-screen keypad edits a STRING, never a number: "0.", "12." and "0.50" are all states a
// person passes through while typing, and a float would collapse them. parseAmountToMinor turns
// the finished string into integer cents when it is time to quote or submit.
export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

const MAX_WHOLE_DIGITS = 9; // $999,999,999.99 — far beyond any wallet, well inside a phone screen
const MAX_DECIMALS = 2;

export function applyKey(current: string, key: KeypadKey): string {
  if (key === 'back') return current.slice(0, -1);
  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }
  // digit
  const [whole, frac] = current.split('.');
  const hasDot = current.includes('.');
  if (hasDot) return (frac ?? '').length >= MAX_DECIMALS ? current : `${current}${key}`;
  if (whole === '0') return key === '0' ? current : key; // "0" then "5" → "5", never "05"
  if (whole.length >= MAX_WHOLE_DIGITS) return current;
  return `${current}${key}`;
}

// "1234.5" → "1,234.5" for display; the string keeps whatever the person typed after the dot so a
// trailing "." or "0" is not eaten mid-entry.
export function formatTyped(current: string): string {
  if (current === '') return '';
  const [whole, frac] = current.split('.');
  const grouped = whole === '' ? '0' : Number(whole).toLocaleString('en-US');
  return current.includes('.') ? `${grouped}.${frac ?? ''}` : grouped;
}
