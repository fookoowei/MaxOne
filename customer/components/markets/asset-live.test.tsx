import { describe, expect, it } from 'vitest';
import { applyLive } from './asset-live';

const asset = {
  id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto' as const,
  price: 100, change24h: 1, marketCap: 2_000_000, high24h: 110, low24h: 90,
};

describe('applyLive', () => {
  it('moves price, change AND market cap from one event', () => {
    const next = applyLive(asset, [{ symbol: 'BTC', price: 200, change24h: 5 }]);
    expect(next.price).toBe(200);
    expect(next.change24h).toBe(5);
    expect(next.marketCap).toBe(4_000_000); // cap scales with the price it was computed from
  });

  it('widens the 24h high/low when the live price breaks them', () => {
    expect(applyLive(asset, [{ symbol: 'BTC', price: 130, change24h: 5 }]).high24h).toBe(130);
    expect(applyLive(asset, [{ symbol: 'BTC', price: 80, change24h: -5 }]).low24h).toBe(80);
  });

  it('ignores events for other coins', () => {
    expect(applyLive(asset, [{ symbol: 'ETH', price: 999, change24h: 1 }])).toEqual(asset);
  });

  it('survives a zero starting price without dividing by zero', () => {
    const fresh = { ...asset, price: 0, marketCap: 0 };
    expect(applyLive(fresh, [{ symbol: 'BTC', price: 10, change24h: 0 }]).marketCap).toBe(0);
  });
});
