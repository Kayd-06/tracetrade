import type { Asset, Quote, Signals } from "../types";
import { fetchNews } from "./news";
import { fetchPolymarket } from "./polymarket";

export async function gatherSignals(a: Asset, quote: Quote | undefined): Promise<Signals> {
  const missing: string[] = [];
  const sources: Signals["sources"] = [];
  if (quote) sources.push({ id: `${a.ticker}-PX`, kind: "price", title: `${a.ticker} $${quote.price.toLocaleString("en-US")} (${quote.change24h >= 0 ? "+" : ""}${quote.change24h.toFixed(2)}% 24h)`, outlet: quote.source, url: quote.url, time: quote.time });
  else missing.push("price");
  const [news, pm] = await Promise.allSettled([fetchNews(a), fetchPolymarket(a)]);
  if (news.status === "fulfilled") { sources.push(...news.value); if (!news.value.length) missing.push("news (no recent headlines)"); }
  else missing.push("news (Google News unreachable)");
  if (pm.status === "fulfilled") { if (pm.value) sources.push(pm.value); else missing.push("prediction market (no market found)"); }
  else missing.push("prediction market (Polymarket unreachable)");
  return { ticker: a.ticker, quote, sources, missing };
}
