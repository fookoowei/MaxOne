export interface MarketAsset {
  symbol: string; // "BTC"
  name: string; // "Bitcoin"
  // 'stock' is kept in the union so stocks can be re-added later as a provider swap without a
  // type change — but no stock provider ships today (crypto-only).
  type: 'crypto' | 'stock';
  price: number; // USD, display-only float (NOT integer minor units — never ledger money)
  change24h: number; // percent, e.g. -1.34
}

// CoinGecko coin ids.
export const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'dogecoin'];
