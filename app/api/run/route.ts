import { runAgent } from "@/lib/runAgent";
import { freshPortfolio } from "@/lib/portfolio";
import type { PortfolioState } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  let portfolio: PortfolioState;
  try {
    const body = (await req.json()) as { portfolio?: PortfolioState };
    portfolio = body.portfolio && typeof body.portfolio.cash === "number" ? { ...body.portfolio, log: [] } : freshPortfolio();
  } catch { portfolio = freshPortfolio(); }
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
