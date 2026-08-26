export interface MarketAsset {
  symbol: string; // "BTC", "AAPL"
  name: string; // "Bitcoin", "Apple Inc."
  type: 'crypto' | 'stock';
  price: number; // USD, display-only float (NOT integer minor units — never ledger money)
  change24h: number; // percent, e.g. -1.34
}

// CoinGecko coin ids.
export const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'dogecoin'];

// Finnhub quote returns no company name, so we carry names here.
export const STOCKS: { symbol: string; name: string }[] = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
];
