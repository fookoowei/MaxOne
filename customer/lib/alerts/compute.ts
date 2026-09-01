export interface Alert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  triggeredAt?: string | null; // persisted server state — null/absent = pending (background one-shot)
}
export interface PriceInfo {
  symbol: string;
  price: number;
}
export interface AlertRow extends Alert {
  currentPrice: number | null;
  triggered: boolean;
}

// Evaluate each alert against live prices. No matching price → not triggered. Pure — the single
// source of the trigger logic (fired-once/persistence is out of scope; recomputed each load).
export function computeAlerts(alerts: Alert[], prices: PriceInfo[]): AlertRow[] {
  const bySymbol = new Map(prices.map((p) => [p.symbol, p.price]));
  return alerts.map((a) => {
    const currentPrice = bySymbol.get(a.symbol) ?? null;
    const triggered =
      currentPrice === null
        ? false
        : a.direction === 'above'
          ? currentPrice >= a.targetPrice
          : currentPrice <= a.targetPrice;
    return { ...a, currentPrice, triggered };
  });
}
