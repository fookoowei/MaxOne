import type { Candle } from './market-asset';

// The rules that decide what a number on screen MEANS. Pure on purpose: no HTTP, no cache, no
// Nest — the part worth testing exhaustively.

// Rolling 24h change, read off the 1h candles we already fetch for the chart. Kraken's ticker
// `o` is the UTC-DAY open ("today"), which is a different claim than "24h" — so we derive it
// ourselves and keep every number on screen sourced from one place.
export function changeFromCandles(candles: Candle[], hours = 24): number {
  if (candles.length < 2) return 0;
  const now = candles[candles.length - 1].c;
  const then = candles[Math.max(0, candles.length - 1 - hours)].c;
  if (!then) return 0; // no reference price -> no claim (never NaN/Infinity on screen)
  return ((now - then) / then) * 100;
}

// History is immutable; "now" has exactly one source. A closed candle never changes again (so it
// is safe to cache), but the LAST candle is still open — its close IS the live price, and the
// live price may have broken its high or low. Restating it here is what keeps the chart's right
// edge equal to the header price on every timeframe.
export function restateOpenCandle(candles: Candle[], live: number): Candle[] {
  if (candles.length === 0 || !live) return candles;
  const open = candles[candles.length - 1];
  return [
    ...candles.slice(0, -1),
    { ...open, c: live, h: Math.max(open.h, live), l: Math.min(open.l, live) },
  ];
}

// Computed, never fetched: supply barely moves (cached for an hour) while the price ticks, so
// market cap moves WITH the price instead of lagging a provider's snapshot.
export const marketCap = (price: number, supply: number | null): number =>
  supply ? price * supply : 0;
