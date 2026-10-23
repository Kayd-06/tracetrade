import { describe, expect, it } from "vitest";
import { formatSummary, groupRuns, summarize } from "./summary";
import type { Decision, Verdict } from "./types";

const d = (runId: string, verdict: Verdict, t: string, ticker = "BTC"): Decision => ({
  id: `${runId}-${ticker}`, runId, time: t, verdict, sources: [], checks: [], flags: [], droppedCitations: [], aiMode: "live",
  proposal: { ticker, action: verdict === "hold" ? "HOLD" : "BUY", sizeUsd: 0, confidence: "low", thesis: "", reasoning: "", citedSourceIds: [] },
} as Decision);

describe("summary", () => {
  it("counts each verdict once", () => {
    const s = summarize([d("r1", "approved", "1"), d("r1", "hold", "1"), d("r1", "hold", "1"), d("r1", "blocked", "1"), d("r1", "resized", "1")]);
    expect(s).toEqual({ approved: 1, resized: 1, blocked: 1, hold: 2 });
    expect(formatSummary(s)).toBe("1 approved · 1 resized · 1 blocked · 2 hold");
  });
  it("groups two runs separately, newest first, so the latest run counts only its own 8", () => {
    const tickers = ["BTC", "ETH", "SOL", "AAPL", "NVDA", "TSLA", "MSFT", "SPY"];
    const run1 = tickers.map((t, i) => d("100", i === 2 ? "approved" : "hold", "2026-10-23T10:00:00Z", t));
    const run2 = tickers.map((t) => d("200", "hold", "2026-10-23T10:05:00Z", t));
    const runs = groupRuns([...run2, ...run1]);
    expect(runs).toHaveLength(2);
    expect(runs[0].runId).toBe("200");
    expect(summarize(runs[0].decisions)).toEqual({ approved: 0, resized: 0, blocked: 0, hold: 8 });
    expect(summarize(runs[1].decisions)).toEqual({ approved: 1, resized: 0, blocked: 0, hold: 7 });
  });
  it("falls back to the id timestamp prefix for old logs without runId", () => {
    const old = { ...d("x", "hold", "1"), runId: undefined, id: "1700-BTC" } as Decision;
    const old2 = { ...d("x", "approved", "1"), runId: undefined, id: "1700-ETH" } as Decision;
    expect(groupRuns([old, old2])).toHaveLength(1);
  });
});
