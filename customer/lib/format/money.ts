// Minor units (integer cents) + ISO currency → a localized display string.
// Assumes a 2-decimal currency (all seeded wallets are USD); revisit if a
// zero-decimal currency (e.g. JPY) is ever introduced.
export function formatMoney(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minorUnits / 100);
}
