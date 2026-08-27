import { describe, it, expect } from 'vitest';
import { computePortfolio } from './compute';

const prices = [{ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 40000 }];

describe('computePortfolio', () => {
  it('computes value, invested, pnl, pnl% + totals', () => {
    const p = computePortfolio([{ symbol: 'BTC', quantity: 0.5, avgCost: 30000 }], prices);
    expect(p.rows[0]).toMatchObject({
      id: 'bitcoin',
      name: 'Bitcoin',
      value: 20000,
      invested: 15000,
      pnl: 5000,
    });
    expect(Math.round(p.rows[0].pnlPct)).toBe(33);
    expect(p.totalValue).toBe(20000);
    expect(p.totalInvested).toBe(15000);
    expect(p.totalPnl).toBe(5000);
  });

  it('skips a holding with no matching price', () => {
    const p = computePortfolio([{ symbol: 'ZZZ', quantity: 1, avgCost: 1 }], prices);
    expect(p.rows).toHaveLength(0);
    expect(p.totalValue).toBe(0);
  });
});
