import type { Asset, Source } from "../types";
import { getJson } from "./http";

interface PMMarket { question?: string; outcomes?: string; outcomePrices?: string; closed?: boolean; active?: boolean; slug?: string; volume?: string | number }
interface PMEvent { title: string; slug: string; endDate?: string; closed?: boolean; markets?: PMMarket[] }

/** Find the soonest-ending active, relevant market and report its YES odds. */
export async function fetchPolymarket(a: Asset): Promise<Source | null> {
  const d = await getJson<{ events?: PMEvent[] }>(`https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(a.polyQuery)}&limit_per_type=8&events_status=active`);
  const now = Date.now();
  const words = [a.polyQuery.toLowerCase(), a.name.toLowerCase(), a.ticker.toLowerCase()];
  const events = (d.events ?? [])
    .filter((e) => !e.closed && e.endDate && new Date(e.endDate).getTime() > now + 6 * 3600_000)
    .filter((e) => words.some((w) => e.title.toLowerCase().includes(w)))
    .sort((x, y) => new Date(x.endDate!).getTime() - new Date(y.endDate!).getTime());
  for (const e of events) {
    for (const m of e.markets ?? []) {
      if (m.closed || !m.outcomePrices) continue;
      try {
        const prices = JSON.parse(m.outcomePrices) as string[];
        const outcomes = m.outcomes ? (JSON.parse(m.outcomes) as string[]) : ["Yes", "No"];
        const p = parseFloat(prices[0]);
        if (!(p > 0.03 && p < 0.97)) continue; // skip near-certain markets — no signal
        return { id: `${a.ticker}-P1`, kind: "polymarket", title: `${m.question ?? e.title} — ${outcomes[0]} ${(p * 100).toFixed(0)}%`, outlet: "Polymarket", url: `https://polymarket.com/event/${e.slug}`, time: new Date().toISOString() };
      } catch { /* skip malformed */ }
    }
  }
  return null;
}
