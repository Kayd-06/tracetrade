import { describe, expect, it } from "vitest";
import { selfCheck, usMarketOpen } from "./selfCheck";
import { verifyCitations, mockDecide } from "./agent";
import { applyDecision, freshPortfolio } from "./portfolio";
import { WATCHLIST } from "./config";
import type { Proposal, Signals, Source, Decision } from "./types";

// Tuesday 2026-10-20 15:00 UTC = 11:00 ET (market open)
const NOW = new Date("2026-10-20T15:00:00Z");
const iso = (minAgo: number) => new Date(NOW.getTime() - minAgo * 60000).toISOString();
const news = (id: string, outlet: string, minAgo = 60): Source => ({ id, kind: "news", title: `headline ${id}`, outlet, url: "https://x", time: iso(minAgo) });
const sig = (over: Partial<Signals> = {}): Signals => ({
  ticker: "BTC",
  quote: { ticker: "BTC", price: 100, change24h: 1, time: iso(2), source: "CoinGecko", url: "https://x" },
  sources: [{ id: "BTC-PX", kind: "price", title: "px", outlet: "CoinGecko", url: "https://x", time: iso(2) }, news("BTC-N1", "Reuters"), news("BTC-N2", "CNBC"), news("BTC-N3", "Reuters")],
  missing: [], ...over,
});
const buy = (over: Partial<Proposal> = {}): Proposal => ({ ticker: "BTC", action: "BUY", sizeUsd: 1000, confidence: "med", thesis: "t", reasoning: "r", citedSourceIds: ["BTC-N1", "BTC-N2"], ...over });

describe("selfCheck", () => {
  it("approves a clean trade", () => {
    const r = selfCheck(buy(), freshPortfolio(), sig(), "crypto", NOW);
    expect(r.verdict).toBe("approved");
    expect(r.executedUsd).toBe(1000);
    expect(r.fillPrice).toBe(100);
  });
  it("resizes trades above 20% of portfolio", () => {
    const r = selfCheck(buy({ sizeUsd: 3000 }), freshPortfolio(), sig(), "crypto", NOW);
    expect(r.verdict).toBe("resized");
    expect(r.executedUsd).toBe(2000);
    expect(r.checks.find((c) => c.rule === "Max position size")?.pass).toBe(false);
  });
  it("blocks when only one independent outlet is cited", () => {
    const r = selfCheck(buy({ citedSourceIds: ["BTC-N1", "BTC-N3"] }), freshPortfolio(), sig(), "crypto", NOW);
    expect(r.verdict).toBe("blocked");
    expect(r.checks.find((c) => c.rule === "Source independence")?.reason).toMatch(/Only 1/);
  });
  it("does not count the price feed as an independent source", () => {
    const r = selfCheck(buy({ citedSourceIds: ["BTC-PX", "BTC-N1"] }), freshPortfolio(), sig(), "crypto", NOW);
    expect(r.verdict).toBe("blocked");
  });
  it("blocks stale prices", () => {
    const s = sig(); s.quote!.time = iso(30);
    expect(selfCheck(buy(), freshPortfolio(), s, "crypto", NOW).verdict).toBe("blocked");
  });
  it("blocks when all headlines are older than 48h", () => {
    const s = sig({ sources: [news("BTC-N1", "Reuters", 60 * 50), news("BTC-N2", "CNBC", 60 * 50)] });
    expect(selfCheck(buy(), freshPortfolio(), s, "crypto", NOW).verdict).toBe("blocked");
  });
  it("blocks when there is no price", () => {
    expect(selfCheck(buy(), freshPortfolio(), sig({ quote: undefined }), "crypto", NOW).verdict).toBe("blocked");
  });
  it("blocks SELL without a holding (no shorting)", () => {
    const r = selfCheck(buy({ action: "SELL" }), freshPortfolio(), sig(), "crypto", NOW);
    expect(r.verdict).toBe("blocked");
    expect(r.checks.find((c) => c.rule === "Holding exists")?.pass).toBe(false);
  });
  it("caps SELL at the held amount", () => {
    const p = { ...freshPortfolio(), holdings: { BTC: { qty: 5, avgCost: 90 } } };
    const r = selfCheck(buy({ action: "SELL", sizeUsd: 9999 }), p, sig(), "crypto", NOW);
    expect(r.verdict).toBe("resized");
    expect(r.executedQty).toBe(5);
    expect(r.executedUsd).toBe(500);
  });
  it("resizes to available cash, and blocks if under $100", () => {
    const p = { ...freshPortfolio(), cash: 500, holdings: { ETH: { qty: 95, avgCost: 100 } } };
    expect(selfCheck(buy({ sizeUsd: 1000 }), p, sig(), "crypto", NOW)).toMatchObject({ verdict: "resized", executedUsd: 500 });
    expect(selfCheck(buy({ sizeUsd: 1000 }), { ...p, cash: 50 }, sig(), "crypto", NOW).verdict).toBe("blocked");
  });
  it("flags stock trades when the US market is closed", () => {
    const sat = new Date("2026-10-24T15:00:00Z");
    const s = sig(); s.quote!.time = new Date("2026-10-23T20:00:00Z").toISOString();
    s.sources = s.sources.map((x) => ({ ...x, time: new Date(sat.getTime() - 3600_000).toISOString() }));
    const r = selfCheck(buy(), freshPortfolio(), s, "stock", sat);
    expect(r.verdict).toBe("approved");
    expect(r.flags.join()).toMatch(/last close/);
  });
  it("HOLD is never executed", () => {
    expect(selfCheck(buy({ action: "HOLD" }), freshPortfolio(), sig(), "crypto", NOW).verdict).toBe("hold");
  });
  it("knows US market hours", () => {
    expect(usMarketOpen(NOW)).toBe(true);
    expect(usMarketOpen(new Date("2026-10-20T22:00:00Z"))).toBe(false);
  });
});

describe("citation verification", () => {
  it("drops cited IDs that were never fetched", () => {
    const r = verifyCitations(["BTC-N1", "BTC-N9", "FAKE", "BTC-N1"], sig());
    expect(r.kept).toEqual(["BTC-N1"]);
    expect(r.dropped).toEqual(["BTC-N9", "FAKE"]);
  });
});

describe("portfolio", () => {
  it("applies buys and sells", () => {
    const base = freshPortfolio();
    const d = (action: "BUY" | "SELL", usd: number, qty: number): Decision => ({ id: "x", time: "", proposal: buy({ action }), sources: [], checks: [], verdict: "approved", executedUsd: usd, executedQty: qty, fillPrice: 100, flags: [], droppedCitations: [], aiMode: "mock" });
    const p1 = applyDecision(base, d("BUY", 1000, 10));
    expect(p1.cash).toBe(9000);
    expect(p1.holdings.BTC?.qty).toBe(10);
    const p2 = applyDecision(p1, d("SELL", 1000, 10));
    expect(p2.cash).toBe(10000);
    expect(p2.holdings.BTC).toBeUndefined();
  });
});

describe("mock agent", () => {
  it("only cites fetched sources", () => {
    const s = sig({ sources: [...sig().sources.slice(0, 1), { ...news("BTC-N1", "Reuters"), title: "Bitcoin rally hits record high" }, { ...news("BTC-N2", "CNBC"), title: "Bitcoin prices surge" }] });
    const p = mockDecide(WATCHLIST[0], s, freshPortfolio());
    expect(p.action).toBe("BUY");
    expect(verifyCitations(p.citedSourceIds, s).dropped).toEqual([]);
  });
});

describe("llmConfig", () => {
  it("chains Gemini free models then Groq, else mock", async () => {
    const { llmConfig, GEMINI_MODELS, GROQ_MODELS } = await import("./agent");
    const both = llmConfig({ GEMINI_API_KEY: "g", GROQ_API_KEY: "q" });
    expect(both.mode).toBe("live");
    expect(both.targets.map((t) => t.model)).toEqual([...GEMINI_MODELS, ...GROQ_MODELS]);
    expect(both.targets.at(-1)?.provider).toBe("groq");
    expect(llmConfig({ GROQ_API_KEY: "q" }).targets.every((t) => t.provider === "groq")).toBe(true);
    expect(llmConfig({ GEMINI_API_KEY: "g", GEMINI_MODEL: "x" }).targets.map((t) => t.model)).toEqual(["x"]);
    expect(llmConfig({}).mode).toBe("mock");
    expect(llmConfig({ GEMINI_API_KEY: "g", MOCK_LLM: "1" }).mode).toBe("mock");
  });
});
