import type { MarketAsset } from '@/components/market-list';

// Overlay live prices onto the SSR catalog by symbol. The catalog (which coins exist) is fixed by
// the server render; only the numbers tick, so unmatched/extra incoming symbols are ignored.
export function mergeLivePrices(current: MarketAsset[], incoming: MarketAsset[]): MarketAsset[] {
  const bySymbol = new Map(incoming.map((a) => [a.symbol, a]));
  return current.map((a) => {
    const live = bySymbol.get(a.symbol);
    return live ? { ...a, price: live.price, change24h: live.change24h } : a;
  });
}
