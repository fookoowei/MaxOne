// Kraken returns its payload under a key that is NOT always the pair you asked for
// (XBTUSD -> XXBTZUSD, but SOLUSD -> SOLUSD). Two rules, one helper:
//   - single-pair calls (OHLC): take the only key that isn't the "last" cursor
//   - multi-pair calls (Ticker): match the key that contains the base asset and ends in USD
export function pickResult<T>(
  result: Record<string, unknown>,
  base?: string,
): T | undefined {
  const keys = Object.keys(result).filter((k) => k !== 'last');
  const key = base
    ? keys.find((k) => k.includes(base) && k.endsWith('USD'))
    : keys[0];
  return key === undefined ? undefined : (result[key] as T);
}

// Kraken sends every number as a string.
export const nums = (row: (string | number)[]): number[] => row.map(Number);
