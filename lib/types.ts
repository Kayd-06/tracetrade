export type Ticker = "BTC" | "ETH" | "SOL" | "AAPL" | "NVDA" | "TSLA" | "MSFT" | "SPY";
export type AssetKind = "crypto" | "stock";
export type Action = "BUY" | "SELL" | "HOLD";
export type Confidence = "low" | "med" | "high";
export type Verdict = "approved" | "resized" | "blocked" | "hold";

export interface Asset { ticker: Ticker; name: string; kind: AssetKind; coingeckoId?: string; newsQuery: string; polyQuery: string }

export interface Quote { ticker: Ticker; price: number; change24h: number; time: string; source: string; url: string; marketOpen?: boolean }

export interface Source { id: string; kind: "price" | "news" | "polymarket"; title: string; outlet: string; url: string; time: string }

export interface Signals { ticker: Ticker; quote?: Quote; sources: Source[]; missing: string[] }

export interface Proposal { ticker: Ticker; action: Action; sizeUsd: number; confidence: Confidence; thesis: string; reasoning: string; citedSourceIds: string[] }

export interface CheckResult { rule: string; pass: boolean; reason: string; effect?: "block" | "resize" | "flag" }

export interface Holding { qty: number; avgCost: number }

export interface PortfolioState { cash: number; holdings: Partial<Record<Ticker, Holding>>; log: Decision[]; updatedAt: string; lastRunAt?: string }

export interface Decision {
  id: string; time: string; proposal: Proposal; sources: Source[]; checks: CheckResult[];
  verdict: Verdict; executedUsd?: number; executedQty?: number; fillPrice?: number; flags: string[];
  droppedCitations: string[]; aiMode: "live" | "mock"; aiNote?: string;
}

export type RunEvent =
  | { type: "step"; step: "signals" | "reasoning" | "check" | "execute"; message: string }
  | { type: "decision"; decision: Decision }
  | { type: "error"; message: string }
  | { type: "done"; summary: Record<Verdict, number>; aiMode: "live" | "mock"; message?: string };
