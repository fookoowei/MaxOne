import { describe, expect, it } from 'vitest';
import { toBars, toLine, priceFormat, formatAxisPrice } from './candles';

const candles = [
  { t: 1789361700, o: 10, h: 12, l: 9, c: 11 },
  { t: 1789361760, o: 11, h: 13, l: 10, c: 12 },
];

describe('toBars', () => {
  it('renames our fields to the ones lightweight-charts wants, keeping seconds', () => {
    expect(toBars(candles)).toEqual([
      { time: 1789361700, open: 10, high: 12, low: 9, close: 11 },
      { time: 1789361760, open: 11, high: 13, low: 10, close: 12 },
    ]);
  });
});

describe('toLine', () => {
  it('keeps only the close, which is all a line can show', () => {
    expect(toLine(candles)).toEqual([
      { time: 1789361700, value: 11 },
      { time: 1789361760, value: 12 },
    ]);
  });
});

describe('priceFormat', () => {
  it('gives cheap coins more decimals than expensive ones', () => {
    expect(priceFormat(77684)).toEqual({ type: 'price', precision: 2, minMove: 0.01 });
    expect(priceFormat(0.0843)).toEqual({ type: 'price', precision: 5, minMove: 0.00001 });
  });
});

describe('formatAxisPrice', () => {
  it('agrees with priceFormat on precision, since the price scale formatter overrides it', () => {
    expect(formatAxisPrice(77684.3)).toBe('$77,684.30');
    expect(formatAxisPrice(0.0843)).toBe('$0.08430');
  });
});
