// Market prices are display-only floats (not integer minor units like wallet money). Sub-$1
// assets (some crypto) get extra decimals so the price isn't rounded to $0.00.
export function formatPrice(value: number, currency = 'USD'): string {
  const digits = value !== 0 && Math.abs(value) < 1 ? 4 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

// Market cap is a trillion-scale number: spelled out in full it overflows its column on a phone
// (it collided with "24h high" at 390px). Compact notation keeps the magnitude legible.
export function formatCompactPrice(value: number, currency = 'USD'): string {
  if (value === 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    // Explicit 0: with style 'currency' the minimum otherwise defaults to the currency's 2 digits
    // (spec behaviour, seen on Node 22 in CI), yielding "$308.70B" instead of "$308.7B". Node 24
    // happens to print "$308.7B" either way, which is why this only broke in CI.
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

// A 24h / P&L change, always signed and always two decimals, so every list agrees: "+3.84%".
export function formatChangePct(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}
