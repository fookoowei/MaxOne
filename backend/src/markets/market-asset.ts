export interface MarketAsset {
  id: string; // CoinGecko id, e.g. "bitcoin" (used for detail routing + charts)
  symbol: string; // "BTC"
  name: string; // "Bitcoin"
  // 'stock' is kept in the union so stocks can be re-added later as a provider swap without a
  // type change — but no stock provider ships today (crypto-only).
  type: 'crypto' | 'stock';
  price: number; // USD, display-only float (NOT integer minor units — never ledger money)
  change24h: number; // percent, e.g. -1.34
}

// A single asset's detail — the list fields plus a few stats CoinGecko already returns.
export interface AssetDetail extends MarketAsset {
  marketCap: number;
  high24h: number;
  low24h: number;
}

export interface ChartData {
  points: number[]; // price values, oldest → newest
  labels: string[]; // short labels aligned to points
}

// CoinGecko coin ids.
export const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'dogecoin'];
