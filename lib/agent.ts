import OpenAI from "openai";
import { z } from "zod";
import type { Asset, PortfolioState, Proposal, Signals } from "./types";

export const ProposalSchema = z.object({
  action: z.enum(["BUY", "SELL", "HOLD"]),
  sizeUsd: z.coerce.number().min(0),
  confidence: z.enum(["low", "med", "high"]),
  thesis: z.string().min(1).max(300),
  reasoning: z.string().min(1).max(2000),
  citedSourceIds: z.array(z.string()).default([]),
});

export interface LlmTarget { provider: string; baseURL: string; apiKey: string; model: string }
export interface LlmConfig { mode: "live" | "mock"; provider: string; model?: string; targets: LlmTarget[] }

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const GROQ_URL = "https://api.groq.com/openai/v1";
/** Free-tier models, tried in order on 429/503/404/timeout. Verified via each provider's models API on 2026-10-23
 *  (gemini-3.8-flash exists but returned 429 on the free key; Groq no longer lists llama-3.3-70b-versatile). */
export const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.8-flash"];
export const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

export function llmConfig(env: Record<string, string | undefined> = process.env): LlmConfig {
  if (env.MOCK_LLM === "1") return { mode: "mock", provider: "mock", targets: [] };
  const targets: LlmTarget[] = [];
  if (env.LLM_BASE_URL && env.LLM_MODEL) targets.push({ provider: "custom", baseURL: env.LLM_BASE_URL, apiKey: env.LLM_API_KEY ?? "none", model: env.LLM_MODEL });
  if (env.GEMINI_API_KEY) for (const m of env.GEMINI_MODEL ? [env.GEMINI_MODEL] : GEMINI_MODELS) targets.push({ provider: "gemini", baseURL: GEMINI_URL, apiKey: env.GEMINI_API_KEY, model: m });
  if (env.GROQ_API_KEY) for (const m of env.GROQ_MODEL ? [env.GROQ_MODEL] : GROQ_MODELS) targets.push({ provider: "groq", baseURL: GROQ_URL, apiKey: env.GROQ_API_KEY, model: m });
  if (!targets.length) return { mode: "mock", provider: "mock", targets };
  const providers = [...new Set(targets.map((t) => t.provider))];
  return { mode: "live", provider: providers.join("+"), model: targets[0].model, targets };
}

/** Citation verification: keep only IDs that were really fetched for this asset. */
export function verifyCitations(ids: string[], sig: Signals): { kept: string[]; dropped: string[] } {
  const known = new Set(sig.sources.map((s) => s.id));
  const uniq = [...new Set(ids)];
  return { kept: uniq.filter((i) => known.has(i)), dropped: uniq.filter((i) => !known.has(i)) };
}

const SYSTEM = `You are TraceTrade, a disciplined paper-trading analyst managing a $10,000 practice portfolio. You decide BUY, SELL or HOLD for ONE asset using ONLY the numbered sources provided.
Rules:
- Cite sources by their exact IDs (e.g. "BTC-N2") in citedSourceIds and inline in reasoning like [BTC-N2]. Never invent IDs or facts.
- SELL is only possible if the portfolio holds the asset (it closes or reduces a holding; no shorting).
- sizeUsd is the dollar amount to trade (0 for HOLD).
- Do not default to HOLD. If the cited evidence leans clearly one way (e.g. supportive headlines from 2+ outlets, price momentum, or prediction-market odds that agree), propose a trade sized to your conviction: roughly $500-1,500 for low/med confidence, up to $2,500 for high. HOLD only when evidence is genuinely mixed, thin or contradictory.
- If you hold the asset and the evidence has turned against it, SELL part or all of it.
- Be honest: never overstate the evidence. A separate rule-based self-check will resize or block trades that break risk limits, so propose what the evidence supports.
- Keep thesis to one sentence; reasoning to 3-6 sentences.
Return ONLY a JSON object: {"action":"BUY|SELL|HOLD","sizeUsd":number,"confidence":"low|med|high","thesis":string,"reasoning":string,"citedSourceIds":string[]}`;

function userPrompt(a: Asset, sig: Signals, p: PortfolioState): string {
  const h = p.holdings[a.ticker];
  const lines = sig.sources.map((s) => `[${s.id}] (${s.kind}, ${s.outlet}, ${s.time}) ${s.title}`);
  return `Asset: ${a.ticker} (${a.name}, ${a.kind})
Portfolio: cash $${p.cash.toFixed(2)}; ${a.ticker} holding: ${h ? `${h.qty.toFixed(6)} units @ avg $${h.avgCost.toFixed(2)}` : "none"}
Missing data: ${sig.missing.join("; ") || "none"}
Sources:
${lines.join("\n") || "(none)"}`;
}

function extractJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON object in reply");
  return JSON.parse(m[0]);
}

export async function decide(a: Asset, sig: Signals, p: PortfolioState, cfg: LlmConfig): Promise<{ proposal: Proposal; dropped: string[]; note?: string; model?: string }> {
  if (cfg.mode === "mock") return finalize(a, sig, mockDecide(a, sig, p));
  const deadline = Date.now() + PER_ASSET_BUDGET_MS;
  let lastErr = "";
  let parseRetried = false;
  for (let ti = 0; ti < cfg.targets.length; ) {
    const t = cfg.targets[ti];
    const remaining = deadline - Date.now();
    if (remaining < 1500) { lastErr ||= "time budget exhausted"; break; }
    const client = new OpenAI({ apiKey: t.apiKey, baseURL: t.baseURL, timeout: Math.min(CALL_TIMEOUT_MS, remaining), maxRetries: 0 });
    try {
      const res = await client.chat.completions.create({
        model: t.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        ...(t.provider === "gemini" || t.model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" as const } : {}),
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt(a, sig, p) + (parseRetried ? "\n\nYour previous reply was not valid JSON. Reply with the JSON object only." : "") }],
      });
      try {
        const parsed = ProposalSchema.parse(extractJson(res.choices[0]?.message?.content ?? ""));
        return { ...finalize(a, sig, parsed), model: `${t.provider}/${t.model}` };
      } catch (e) {
        lastErr = `parse: ${e instanceof Error ? e.message : e}`;
        console.warn(`[agent] ${a.ticker} ${t.model}: ${lastErr.slice(0, 200)}`);
        if (parseRetried) ti++;
        parseRetried = !parseRetried;
      }
    } catch (e) {
      const status = (e as { status?: number }).status;
      lastErr = `${status ?? ""} ${e instanceof Error ? e.message : String(e)}`.trim();
      console.warn(`[agent] ${a.ticker} ${t.model}: ${lastErr.slice(0, 200)}`);
      ti++; // 429/503/404/timeout/other → next model, then next provider
    }
  }
  return { proposal: { ticker: a.ticker, action: "HOLD", sizeUsd: 0, confidence: "low", thesis: "AI unavailable, holding.", reasoning: `The AI call failed (${lastErr.slice(0, 160)}), so no trade was proposed.`, citedSourceIds: [] }, dropped: [], note: "AI error" };
}

/** Timing so a full run (signals ~3s + 2 batches of 4 assets) fits Vercel's 60s limit. */
export const CALL_TIMEOUT_MS = 12_000;
export const PER_ASSET_BUDGET_MS = 24_000;

function finalize(a: Asset, sig: Signals, raw: z.infer<typeof ProposalSchema>) {
  const { kept, dropped } = verifyCitations(raw.citedSourceIds, sig);
  const proposal: Proposal = { ticker: a.ticker, ...raw, sizeUsd: raw.action === "HOLD" ? 0 : raw.sizeUsd, citedSourceIds: kept };
  return { proposal, dropped };
}

/* ---------------- Mock agent (no API key needed) ----------------
   Deterministic keyword sentiment over the REAL fetched headlines + price move.
   Clearly labelled "MOCK AI" in the UI. */
const POS = ["surge", "soar", "rally", "jump", "gain", "beat", "record", "rise", "rises", "bull", "upgrade", "high", "climb", "boost", "strong", "inflow"];
const NEG = ["fall", "falls", "drop", "plunge", "slump", "miss", "cut", "bear", "downgrade", "low", "sell-off", "selloff", "lawsuit", "probe", "weak", "outflow", "crash", "decline"];

export function mockDecide(a: Asset, sig: Signals, p: PortfolioState): z.infer<typeof ProposalSchema> {
  const news = sig.sources.filter((s) => s.kind === "news");
  const score = (t: string) => { const l = t.toLowerCase(); return POS.filter((w) => l.includes(w)).length - NEG.filter((w) => l.includes(w)).length; };
  const scored = news.map((n) => ({ n, s: score(n.title) }));
  const newsScore = scored.reduce((acc, x) => acc + x.s, 0);
  const chg = sig.quote?.change24h ?? 0;
  const total = newsScore + (chg > 1 ? 1 : chg < -1 ? -1 : 0);
  const held = p.holdings[a.ticker];
  const px = sig.sources.find((s) => s.kind === "price");
  const pm = sig.sources.find((s) => s.kind === "polymarket");
  const supporting = scored.filter((x) => (total >= 0 ? x.s > 0 : x.s < 0)).map((x) => x.n);
  const cites = [...(px ? [px.id] : []), ...supporting.slice(0, 3).map((n) => n.id), ...(pm ? [pm.id] : [])];
  const tag = (ids: string[]) => ids.map((i) => `[${i}]`).join(" ");
  if (total >= 1) {
    const conf = total >= 3 ? "high" : total >= 2 ? "med" : "low";
    const size = conf === "high" ? 3000 : conf === "med" ? 2500 : 1200;
    return { action: "BUY", sizeUsd: size, confidence: conf, thesis: `Positive headlines and price action for ${a.name}.`, reasoning: `Headline sentiment score is +${newsScore} across ${news.length} recent stories ${tag(supporting.slice(0, 3).map((n) => n.id))}; 24h move ${chg.toFixed(2)}% ${px ? `[${px.id}]` : ""}.${pm ? ` Prediction market context: ${pm.title} [${pm.id}].` : ""} Momentum looks constructive, so the agent proposes a ${conf}-confidence buy.`, citedSourceIds: cites };
  }
  if (total <= -1 && held) {
    return { action: "SELL", sizeUsd: held.qty * (sig.quote?.price ?? held.avgCost), confidence: total <= -2 ? "high" : "med", thesis: `Negative news flow: close the ${a.ticker} position.`, reasoning: `Headline sentiment is ${newsScore} ${tag(supporting.slice(0, 3).map((n) => n.id))} and the 24h move is ${chg.toFixed(2)}% ${px ? `[${px.id}]` : ""}. The agent prefers to step aside and sell the holding.`, citedSourceIds: cites };
  }
  return { action: "HOLD", sizeUsd: 0, confidence: "low", thesis: total <= -1 ? "Bearish, but nothing held to sell (no shorting)." : "Signals are mixed or weak.", reasoning: `Headline sentiment ${newsScore >= 0 ? "+" : ""}${newsScore}, 24h move ${chg.toFixed(2)}%. Not strong enough to act.`, citedSourceIds: px ? [px.id] : [] };
}
