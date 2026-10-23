import { WATCHLIST } from "../config";
import type { Quote, Ticker } from "../types";
import { getJson } from "./http";
import { usMarketOpen } from "../selfCheck";

type CG = Record<string, { usd: number; usd_24h_change: number; last_updated_at: number }>;

async function cryptoQuotes(): Promise<Quote[]> {
  const ids = WATCHLIST.filter((a) => a.coingeckoId).map((a) => a.coingeckoId).join(",");
  const d = await getJson<CG>(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`);
  return WATCHLIST.filter((a) => a.coingeckoId && d[a.coingeckoId!]).map((a) => {
    const r = d[a.coingeckoId!];
    return { ticker: a.ticker, price: r.usd, change24h: r.usd_24h_change ?? 0, time: new Date(r.last_updated_at * 1000).toISOString(), source: "CoinGecko", url: `https://www.coingecko.com/en/coins/${a.coingeckoId}` };
  });
}

interface YChart { chart: { result: { meta: { regularMarketPrice: number; chartPreviousClose: number; previousClose?: number; regularMarketTime: number } }[] | null } }

async function stockQuote(t: Ticker): Promise<Quote> {
  const d = await getJson<YChart>(`https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=5d`);
  const m = d.chart.result?.[0]?.meta;
  if (!m?.regularMarketPrice) throw new Error(`No Yahoo price for ${t}`);
  const prev = m.previousClose ?? m.chartPreviousClose;
  return { ticker: t, price: m.regularMarketPrice, change24h: prev ? ((m.regularMarketPrice - prev) / prev) * 100 : 0, time: new Date(m.regularMarketTime * 1000).toISOString(), source: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${t}`, marketOpen: usMarketOpen(new Date()) };
}

export async function fetchQuotes(): Promise<{ quotes: Partial<Record<Ticker, Quote>>; errors: string[] }> {
  const quotes: Partial<Record<Ticker, Quote>> = {};
  const errors: string[] = [];
  const stocks = WATCHLIST.filter((a) => a.kind === "stock");
  const results = await Promise.allSettled([cryptoQuotes(), ...stocks.map((a) => stockQuote(a.ticker))]);
  results.forEach((r, i) => {
    if (r.status === "fulfilled") (Array.isArray(r.value) ? r.value : [r.value]).forEach((q) => (quotes[q.ticker] = q));
    else errors.push(i === 0 ? `crypto prices: ${r.reason?.message ?? r.reason}` : `${stocks[i - 1].ticker} price: ${r.reason?.message ?? r.reason}`);
  });
  return { quotes, errors };
}
