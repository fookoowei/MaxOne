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
