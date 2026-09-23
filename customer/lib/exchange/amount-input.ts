// The amount field accepts anything a keyboard can produce and keeps only what a money amount can
// be: digits, one decimal point, at most two decimals, no leading zero, and a whole part that still
// fits on a phone. It edits a STRING on purpose — "0." and "12.5" are states a person passes
// through while typing, and a float would collapse them. parseAmountToMinor turns the finished
// string into integer cents at the API boundary.
const MAX_WHOLE_DIGITS = 9; // $999,999,999.99 — far beyond any wallet, well inside a phone screen
const MAX_DECIMALS = 2;

export function sanitizeAmount(raw: string): string {
  let out = '';
  for (const ch of raw) {
    if (ch === '.') {
      if (out.includes('.')) continue;
      out = out === '' ? '0.' : `${out}.`;
      continue;
    }
    if (ch < '0' || ch > '9') continue; // commas, spaces, letters, minus signs
    const [whole, frac] = out.split('.');
    if (out.includes('.')) {
      if ((frac ?? '').length >= MAX_DECIMALS) continue;
      out += ch;
    } else if (whole === '0') {
      out = ch === '0' ? '0' : ch; // "0" then "5" → "5", never "05"
    } else if (whole.length < MAX_WHOLE_DIGITS) {
      out += ch;
    }
  }
  return out;
}
