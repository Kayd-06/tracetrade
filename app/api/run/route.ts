import { runAgent } from "@/lib/runAgent";
import { WATCHLIST } from "@/lib/config";
import { freshPortfolio } from "@/lib/portfolio";
import type { PortfolioState } from "@/lib/types";

export const maxDuration = 60;

function validPortfolio(p: unknown): p is PortfolioState {
  if (!p || typeof p !== "object") return false;
  const { cash, holdings } = p as PortfolioState;
  if (typeof cash !== "number" || !Number.isFinite(cash) || cash < 0) return false;
  if (!holdings || typeof holdings !== "object") return false;
  return Object.entries(holdings).every(([t, h]) => WATCHLIST.some((a) => a.ticker === t) && h && Number.isFinite(h.qty) && h.qty >= 0 && Number.isFinite(h.avgCost) && h.avgCost >= 0);
}

export async function POST(req: Request) {
  let body: { portfolio?: PortfolioState };
  try { body = await req.json(); } catch { return Response.json({ error: "Body must be JSON: { portfolio }" }, { status: 400 }); }
  const bp = body?.portfolio;
  if (bp !== undefined && !validPortfolio(bp)) return Response.json({ error: "Invalid portfolio: need { cash: number >= 0, holdings: { TICKER: { qty, avgCost } } }" }, { status: 400 });
  const portfolio: PortfolioState = bp ? { ...bp, log: [] } : freshPortfolio();
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of runAgent(portfolio)) controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      } catch (e) {
        controller.enqueue(enc.encode(JSON.stringify({ type: "error", message: `Run failed: ${e instanceof Error ? e.message : e}` }) + "\n"));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
