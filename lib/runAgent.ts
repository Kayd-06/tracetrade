import { WATCHLIST } from "./config";
import { decide, llmConfig } from "./agent";
import { selfCheck } from "./selfCheck";
import { fetchQuotes } from "./signals/prices";
import { gatherSignals } from "./signals";
import { applyDecision } from "./portfolio";
import type { Decision, PortfolioState, RunEvent, Verdict } from "./types";

/** Orchestrates one run. Decisions are checked sequentially against the evolving portfolio. */
export async function* runAgent(start: PortfolioState): AsyncGenerator<RunEvent> {
  const cfg = llmConfig();
  yield { type: "step", step: "signals", message: `Fetching prices, headlines and Polymarket odds for ${WATCHLIST.length} assets…` };
  const { quotes, errors } = await fetchQuotes();
  for (const e of errors) yield { type: "step", step: "signals", message: `⚠ ${e}` };
  if (Object.keys(quotes).length === 0) { yield { type: "error", message: "Couldn't reach price data — try again. Portfolio untouched." }; return; }
  const signals = await Promise.all(WATCHLIST.map((a) => gatherSignals(a, quotes[a.ticker])));
  const nSrc = signals.reduce((n, s) => n + s.sources.length, 0);
  yield { type: "step", step: "signals", message: `Collected ${nSrc} sources.` };

  yield { type: "step", step: "reasoning", message: cfg.mode === "mock" ? "MOCK AI: rule-based stand-in (no API key set)…" : `Asking ${cfg.provider} (${cfg.model}) for decisions…` };
  const proposals = await Promise.all(WATCHLIST.map((a, i) => decide(a, signals[i], start, cfg)));
  if (cfg.mode === "live" && proposals.every((p) => p.note === "AI error")) {
    yield { type: "error", message: "Couldn't reach the AI — try again. Portfolio untouched." };
    return;
  }

  yield { type: "step", step: "check", message: "Self-check: verifying each proposal against risk rules…" };
  let portfolio = start;
  const summary: Record<Verdict, number> = { approved: 0, resized: 0, blocked: 0, hold: 0 };
  for (let i = 0; i < WATCHLIST.length; i++) {
    const a = WATCHLIST[i];
    const { proposal, dropped, note } = proposals[i];
    const out = selfCheck(proposal, portfolio, signals[i], a.kind);
    const d: Decision = {
      id: `${Date.now()}-${a.ticker}`, time: new Date().toISOString(), proposal,
      sources: signals[i].sources, checks: out.checks, verdict: out.verdict,
      executedUsd: out.executedUsd, executedQty: out.executedQty, fillPrice: out.fillPrice,
      flags: [...out.flags, ...signals[i].missing.map((m) => `Missing: ${m}`)],
      droppedCitations: dropped, aiMode: cfg.mode, aiNote: note,
    };
    portfolio = applyDecision(portfolio, d);
    summary[d.verdict]++;
    if (d.verdict !== "hold") yield { type: "step", step: "execute", message: `${a.ticker} ${proposal.action} → ${d.verdict.toUpperCase()}` };
    yield { type: "decision", decision: d };
  }
  yield { type: "done", summary, aiMode: cfg.mode, message: summary.approved + summary.resized === 0 ? "No trades this run — agent saw no strong signal or every trade was blocked." : undefined };
}
