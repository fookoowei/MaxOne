// Curated set of 2-decimal currencies for holding/converting. Zero-decimal currencies
// (JPY, KRW) are intentionally excluded until formatMoney is made decimal-aware.
export const SUPPORTED_CURRENCIES: { code: string; name: string }[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
];

export const CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code);
