import type { Asset } from "./types";

export const START_CASH = 10_000;
export const STORAGE_KEY = "tracetrade:v1";

export const WATCHLIST: Asset[] = [
  { ticker: "BTC", name: "Bitcoin", kind: "crypto", coingeckoId: "bitcoin", newsQuery: "Bitcoin price", polyQuery: "bitcoin" },
  { ticker: "ETH", name: "Ethereum", kind: "crypto", coingeckoId: "ethereum", newsQuery: "Ethereum price", polyQuery: "ethereum" },
  { ticker: "SOL", name: "Solana", kind: "crypto", coingeckoId: "solana", newsQuery: "Solana crypto", polyQuery: "solana" },
  { ticker: "AAPL", name: "Apple", kind: "stock", newsQuery: "Apple stock AAPL", polyQuery: "apple" },
  { ticker: "NVDA", name: "NVIDIA", kind: "stock", newsQuery: "NVIDIA stock NVDA", polyQuery: "nvidia" },
  { ticker: "TSLA", name: "Tesla", kind: "stock", newsQuery: "Tesla stock TSLA", polyQuery: "tesla" },
  { ticker: "MSFT", name: "Microsoft", kind: "stock", newsQuery: "Microsoft stock MSFT", polyQuery: "microsoft" },
  { ticker: "SPY", name: "S&P 500 ETF", kind: "stock", newsQuery: "S&P 500 stock market", polyQuery: "s&p 500" },
];

export const RULES = {
  maxPositionPct: 0.2,
  minIndependentSources: 2,
  maxPriceAgeMin: 15,
  maxNewsAgeHours: 48,
  minTradeUsd: 100,
};

export const FETCH_TIMEOUT_MS = 10_000;
