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
  image?: string;
}
export interface AlertRow extends Alert {
  currentPrice: number | null;
  triggered: boolean;
  image?: string; // carried from the matched price so the row can show the coin's logo
}

// Evaluate each alert against live prices. No matching price → not triggered. Pure — the single
// source of the trigger logic (fired-once/persistence is out of scope; recomputed each load).
export function computeAlerts(alerts: Alert[], prices: PriceInfo[]): AlertRow[] {
  const bySymbol = new Map(prices.map((p) => [p.symbol, p]));
  return alerts.map((a) => {
    const match = bySymbol.get(a.symbol);
    const currentPrice = match?.price ?? null;
    const triggered =
      currentPrice === null
        ? false
        : a.direction === 'above'
          ? currentPrice >= a.targetPrice
          : currentPrice <= a.targetPrice;
    return { ...a, currentPrice, triggered, image: match?.image };
  });
}
