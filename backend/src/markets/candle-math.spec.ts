import { changeFromCandles, marketCap, restateOpenCandle } from './candle-math';
import type { Candle } from './market-asset';

const hourly = (closes: number[]): Candle[] =>
  closes.map((c, i) => ({ t: i * 3600, o: c, h: c, l: c, c }));

describe('changeFromCandles', () => {
  it('is the percent move from the close 24 hourly candles back', () => {
    const candles = hourly([...Array(24).fill(100), 110]); // 25 candles, 24 back = 100
    expect(changeFromCandles(candles)).toBeCloseTo(10);
  });

  it('goes negative when the price fell', () => {
    expect(changeFromCandles(hourly([...Array(24).fill(200), 150]))).toBeCloseTo(-25);
  });

  it('falls back to the oldest candle it has when there is less than 24h of history', () => {
    expect(changeFromCandles(hourly([50, 75]))).toBeCloseTo(50);
  });

  it('is 0 (not NaN/Infinity) with no history or a zero reference price', () => {
    expect(changeFromCandles([])).toBe(0);
    expect(changeFromCandles(hourly([0, 10]))).toBe(0);
  });
});

describe('restateOpenCandle', () => {
  const candles: Candle[] = [
    { t: 60, o: 10, h: 12, l: 9, c: 11 },
    { t: 120, o: 11, h: 13, l: 10, c: 12 },
  ];

  it('closes the open candle at the live price', () => {
    expect(restateOpenCandle(candles, 12.5).at(-1)).toEqual({ t: 120, o: 11, h: 13, l: 10, c: 12.5 });
  });

  it('widens the high when the live price broke above it', () => {
    expect(restateOpenCandle(candles, 14).at(-1)).toEqual({ t: 120, o: 11, h: 14, l: 10, c: 14 });
  });

  it('widens the low when the live price broke below it', () => {
    expect(restateOpenCandle(candles, 8).at(-1)).toEqual({ t: 120, o: 11, h: 13, l: 8, c: 8 });
  });

  it('never touches closed candles', () => {
    expect(restateOpenCandle(candles, 99)[0]).toEqual(candles[0]);
  });

  it('leaves the history alone when there is no live price or no history', () => {
    expect(restateOpenCandle(candles, 0)).toEqual(candles);
    expect(restateOpenCandle([], 10)).toEqual([]);
  });
});

describe('marketCap', () => {
  it('is price x circulating supply', () => {
    expect(marketCap(77_684.3, 19_970_852)).toBeCloseTo(1_551_421_658_023.6, 0);
  });

  it('is 0 when supply is unknown, so the UI can hide it instead of lying', () => {
    expect(marketCap(77_684.3, null)).toBe(0);
  });
});
