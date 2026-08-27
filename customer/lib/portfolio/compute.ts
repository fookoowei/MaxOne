export interface Holding {
  symbol: string;
  quantity: number;
  avgCost: number;
}
export interface PriceInfo {
  id: string;
  symbol: string;
  name: string;
  price: number;
}
export interface HoldingRow {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  value: number;
  invested: number;
  pnl: number;
  pnlPct: number;
}
export interface Portfolio {
  rows: HoldingRow[];
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
}

// Join holdings with live prices → value + profit/loss per holding and overall. A holding whose
// symbol has no matching price is skipped. Pure — the single source of the portfolio math.
export function computePortfolio(holdings: Holding[], prices: PriceInfo[]): Portfolio {
  const bySymbol = new Map(prices.map((p) => [p.symbol, p]));
  const rows: HoldingRow[] = [];
  for (const h of holdings) {
    const p = bySymbol.get(h.symbol);
    if (!p) continue;
    const value = h.quantity * p.price;
    const invested = h.quantity * h.avgCost;
    rows.push({
      id: p.id,
      symbol: h.symbol,
      name: p.name,
      quantity: h.quantity,
      currentPrice: p.price,
      value,
      invested,
      pnl: value - invested,
      pnlPct: h.avgCost > 0 ? ((p.price - h.avgCost) / h.avgCost) * 100 : 0,
    });
  }
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalInvested = rows.reduce((s, r) => s + r.invested, 0);
  return { rows, totalValue, totalInvested, totalPnl: totalValue - totalInvested };
}
