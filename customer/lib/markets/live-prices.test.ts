import { describe, it, expect } from 'vitest';
import { mergeLivePrices } from './live-prices';
import type { MarketAsset } from '@/components/market-list';

const btc: MarketAsset = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000, change24h: 2 };
const eth: MarketAsset = { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 2500, change24h: -1 };

describe('mergeLivePrices', () => {
  it('overlays price and change24h for matching symbols', () => {
    const out = mergeLivePrices([btc, eth], [{ ...btc, price: 44000, change24h: 5 }]);
    expect(out.find((a) => a.symbol === 'BTC')).toMatchObject({ price: 44000, change24h: 5 });
  });

  it('leaves assets with no incoming match untouched', () => {
    const out = mergeLivePrices([btc, eth], [{ ...btc, price: 44000, change24h: 5 }]);
    expect(out.find((a) => a.symbol === 'ETH')).toMatchObject({ price: 2500, change24h: -1 });
  });

  it('ignores incoming symbols not in the current catalog', () => {
    const doge: MarketAsset = { ...btc, id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.1 };
    const out = mergeLivePrices([btc], [doge]);
    expect(out).toHaveLength(1);
    expect(out[0].symbol).toBe('BTC');
  });

  it('does not mutate the input array', () => {
    const current = [btc];
    mergeLivePrices(current, [{ ...btc, price: 99999, change24h: 9 }]);
    expect(current[0].price).toBe(43000);
  });
});
