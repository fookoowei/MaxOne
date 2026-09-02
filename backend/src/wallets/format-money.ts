const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };

// Minor units (cents) → display string. Curated currencies are 2-decimal (JPY excluded).
export function formatMinor(amount: number, currency: string): string {
  const n = (amount / 100).toFixed(2);
  const sym = SYMBOLS[currency];
  return sym ? `${sym}${n}` : `${n} ${currency}`;
}
