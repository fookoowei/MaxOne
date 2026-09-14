import type { UTCTimestamp } from 'lightweight-charts';

export interface Candle { t: number; o: number; h: number; l: number; c: number }

// lightweight-charts takes unix SECONDS, which is exactly what the API sends — no conversion,
// and the axis renders in the VIEWER's timezone (the old server-formatted labels were UTC).
// `Time` is a nominal-branded number in the library's own types, so a plain number needs the
// cast the library's docs call for — it's a compile-time label only, not a runtime change.
export const toBars = (candles: Candle[]) =>
  candles.map((k) => ({
    time: k.t as UTCTimestamp,
    open: k.o,
    high: k.h,
    low: k.l,
    close: k.c,
  }));

export const toLine = (candles: Candle[]) =>
  candles.map((k) => ({ time: k.t as UTCTimestamp, value: k.c }));

// DOGE at $0.084 needs more decimals than BTC at $77,684.
export const priceFormat = (price: number) =>
  price < 1
    ? { type: 'price' as const, precision: 5, minMove: 0.00001 }
    : { type: 'price' as const, precision: 2, minMove: 0.01 };

// Axis and crosshair labels. Must agree with priceFormat() above — the price scale's own
// formatter overrides the series precision, so the two would otherwise disagree.
export const formatAxisPrice = (p: number): string =>
  `$${p.toLocaleString(
    'en-US',
    p < 1
      ? { minimumFractionDigits: 5, maximumFractionDigits: 5 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  )}`;
