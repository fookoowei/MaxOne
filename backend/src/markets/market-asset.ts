export interface MarketAsset {
  id: string; // CoinGecko id, e.g. "bitcoin" (used for detail routing + charts)
  symbol: string; // "BTC"
  name: string; // "Bitcoin"
  // 'stock' is kept in the union so stocks can be re-added later as a provider swap without a
  // type change — but no stock provider ships today (crypto-only).
  type: 'crypto' | 'stock';
  price: number; // USD, display-only float (NOT integer minor units — never ledger money)
  change24h: number; // percent, e.g. -1.34
  // Coin logo hosted by the provider. Optional on purpose: an older cached payload or a future
  // provider without artwork just means the client falls back to its lettered badge.
  image?: string;
}

// A single asset's detail — the list fields plus a few stats CoinGecko already returns.
export interface AssetDetail extends MarketAsset {
  marketCap: number;
  high24h: number;
  low24h: number;
}

// A candle: one interval's open/high/low/close. `t` is unix SECONDS (Kraken's unit, and
// lightweight-charts' unit — do not convert).
export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

// The chart payload. Was {points[], labels[]} — parallel arrays with the timestamp thrown away
// and the label formatted on the SERVER (i.e. in the container's UTC, which is not the user's
// clock). One self-describing array now; formatting belongs in the browser.
export interface ChartData {
  candles: Candle[]; // oldest -> newest; the LAST one is still open
}

export const RANGES = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;
export type Range = (typeof RANGES)[number];

// Kraken's OHLC `interval` is in minutes. 720 candles come back at every interval, so the
// timeframe IS the range: 1m~12h, 5m~2.5d, 15m~7.5d, 1h~30d, 4h~120d, 1D~2y.
export const KRAKEN_INTERVAL: Record<Range, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '1h': 60,
  '4h': 240,
  '1D': 1440,
};

export interface Coin {
  id: string; // our stable id, unchanged from the CoinGecko era (routes + saved alerts use it)
  symbol: string;
  name: string;
  krakenPair: string; // what we ASK Kraken for
  krakenBase: string; // what Kraken calls the base asset in its REPLY key
  coinloreId: string; // circulating supply only
  image: string; // loaded by the BROWSER, so no egress block can break it
}

// Names and logos are static: five coins, they don't change, and no provider is required for
// them. CoinIcon's lettered badge remains the fallback if an image 404s.
export const COINS: Coin[] = [
  { id: 'bitcoin',  symbol: 'BTC',  name: 'Bitcoin',  krakenPair: 'XBTUSD', krakenBase: 'XBT', coinloreId: '90',    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
  { id: 'ethereum', symbol: 'ETH',  name: 'Ethereum', krakenPair: 'ETHUSD', krakenBase: 'ETH', coinloreId: '80',    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { id: 'solana',   symbol: 'SOL',  name: 'Solana',   krakenPair: 'SOLUSD', krakenBase: 'SOL', coinloreId: '48543', image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { id: 'cardano',  symbol: 'ADA',  name: 'Cardano',  krakenPair: 'ADAUSD', krakenBase: 'ADA', coinloreId: '257',   image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', krakenPair: 'XDGUSD', krakenBase: 'XDG', coinloreId: '2',     image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
];

export const coinById = (id: string): Coin | undefined => COINS.find((c) => c.id === id);
