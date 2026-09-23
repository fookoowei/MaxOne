// Curated set of 2-decimal currencies for holding/converting. Zero-decimal currencies
// (JPY, KRW) are intentionally excluded until formatMoney is made decimal-aware.
export const SUPPORTED_CURRENCIES: { code: string; name: string; country: string }[] = [
  { code: 'USD', name: 'US Dollar', country: 'US' },
  { code: 'EUR', name: 'Euro', country: 'EU' },
  { code: 'GBP', name: 'British Pound', country: 'GB' },
  { code: 'SGD', name: 'Singapore Dollar', country: 'SG' },
  { code: 'AUD', name: 'Australian Dollar', country: 'AU' },
  { code: 'CAD', name: 'Canadian Dollar', country: 'CA' },
  { code: 'CHF', name: 'Swiss Franc', country: 'CH' },
  { code: 'NZD', name: 'New Zealand Dollar', country: 'NZ' },
  { code: 'HKD', name: 'Hong Kong Dollar', country: 'HK' },
];

export const CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code);

export function currencyName(code: string): string {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code)?.name ?? code;
}

// The flag is two regional-indicator code points, so it needs no image and no network. Unknown
// codes fall back to their first two letters, which the same arithmetic still turns into a flag
// for any real ISO country code.
export function currencyFlag(code: string): string {
  const country = SUPPORTED_CURRENCIES.find((c) => c.code === code)?.country ?? code.slice(0, 2).toUpperCase();
  return String.fromCodePoint(...Array.from(country, (ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
