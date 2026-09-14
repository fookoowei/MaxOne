import { pickResult } from './kraken-shape';
import { COINS, KRAKEN_INTERVAL, RANGES } from '../market-asset';

describe('pickResult', () => {
  it('finds the single payload key, ignoring "last" (OHLC responses)', () => {
    const result = { XXBTZUSD: [[1, '1', '2', '3', '4']], last: 1789361760 };
    expect(pickResult(result)).toEqual([[1, '1', '2', '3', '4']]);
  });

  it('matches a USD pair by base asset when Kraken renames it (XBT -> XXBTZUSD)', () => {
    const result = { XXBTZUSD: { c: ['77684.3'] }, XETHZUSD: { c: ['2519.62'] } };
    expect(pickResult(result, 'XBT')).toEqual({ c: ['77684.3'] });
    expect(pickResult(result, 'ETH')).toEqual({ c: ['2519.62'] });
  });

  it('matches a pair Kraken does NOT rename (SOLUSD)', () => {
    expect(pickResult({ SOLUSD: { c: ['101.5'] } }, 'SOL')).toEqual({ c: ['101.5'] });
  });

  it('returns undefined when nothing matches', () => {
    expect(pickResult({ last: 1 }, 'BTC')).toBeUndefined();
  });
});

describe('coin table', () => {
  it('gives every coin a Kraken pair and base, and a CoinLore id', () => {
    expect(COINS).toHaveLength(5);
    for (const c of COINS) {
      expect(c.krakenPair).toMatch(/USD$/);
      expect(c.krakenBase.length).toBeGreaterThan(2);
      expect(Number(c.coinloreId)).toBeGreaterThan(0);
    }
  });

  it('maps every range to a Kraken interval in minutes', () => {
    expect(RANGES).toEqual(['1m', '5m', '15m', '1h', '4h', '1D']);
    expect(RANGES.map((r) => KRAKEN_INTERVAL[r])).toEqual([1, 5, 15, 60, 240, 1440]);
  });
});
