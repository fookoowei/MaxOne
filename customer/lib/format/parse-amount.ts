// Parse a dollar string to integer minor units (cents) with no float drift:
// split on the decimal and combine as integers. Returns NaN for anything that
// isn't a positive amount with at most 2 decimal places — the caller/schema
// treats NaN as invalid.
export function parseAmountToMinor(input: string): number {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return NaN;
  const [whole, frac = ''] = trimmed.split('.');
  const cents = frac.padEnd(2, '0');
  const minor = Number(whole) * 100 + Number(cents);
  return minor > 0 ? minor : NaN;
}
