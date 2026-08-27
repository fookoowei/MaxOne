import { describe, it, expect } from 'vitest';
import { computeAlerts } from './compute';

const prices = [{ symbol: 'BTC', price: 78000 }];

describe('computeAlerts', () => {
  it('marks an "above" alert triggered when price >= target', () => {
    const [r] = computeAlerts([{ id: 'a1', symbol: 'BTC', targetPrice: 70000, direction: 'above' }], prices);
    expect(r.currentPrice).toBe(78000);
    expect(r.triggered).toBe(true);
  });
  it('marks an "above" alert pending when price < target', () => {
    const [r] = computeAlerts([{ id: 'a1', symbol: 'BTC', targetPrice: 90000, direction: 'above' }], prices);
    expect(r.triggered).toBe(false);
  });
  it('marks a "below" alert triggered when price <= target', () => {
    const [r] = computeAlerts([{ id: 'a1', symbol: 'BTC', targetPrice: 80000, direction: 'below' }], prices);
    expect(r.triggered).toBe(true);
  });
  it('is not triggered when there is no matching price', () => {
    const [r] = computeAlerts([{ id: 'a1', symbol: 'ZZZ', targetPrice: 1, direction: 'above' }], prices);
    expect(r.currentPrice).toBeNull();
    expect(r.triggered).toBe(false);
  });
});
