import { RULES } from "./config";
import { positionValue, round2, totalValue } from "./portfolio";
import type { CheckResult, PortfolioState, Proposal, Signals, Ticker, Verdict } from "./types";

export interface CheckOutcome { verdict: Verdict; executedUsd?: number; executedQty?: number; fillPrice?: number; checks: CheckResult[]; flags: string[] }

/** US regular session: Mon–Fri 9:30–16:00 America/New_York (holidays ignored). */
export function usMarketOpen(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = get("weekday");
  if (wd === "Sat" || wd === "Sun") return false;
  const mins = (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10);
  return mins >= 570 && mins < 960;
}

const ageMin = (iso: string, now: Date) => (now.getTime() - new Date(iso).getTime()) / 60000;

/**
 * Deterministic risk gate. The AI proposes; these rules decide.
 * Block rules run first; then resize rules.
 */
export function selfCheck(p: Proposal, portfolio: PortfolioState, sig: Signals, kind: "crypto" | "stock", now = new Date()): CheckOutcome {
  const checks: CheckResult[] = [];
  const flags: string[] = [];
  if (p.action === "HOLD") return { verdict: "hold", checks, flags };

  const price = sig.quote?.price;
  const prices: Partial<Record<Ticker, number>> = price ? { [p.ticker]: price } : {};
  const block = (rule: string, reason: string) => checks.push({ rule, pass: false, reason, effect: "block" });
  const pass = (rule: string, reason: string) => checks.push({ rule, pass: true, reason });

  // 1. Data freshness
  const news = sig.sources.filter((s) => s.kind === "news");
  const priceAge = sig.quote ? ageMin(sig.quote.time, now) : Infinity;
  const stockClosedOk = kind === "stock" && sig.quote && !usMarketOpen(now); // closed market: last close is the freshest possible
  const newestNewsH = news.length ? Math.min(...news.map((s) => ageMin(s.time, now) / 60)) : Infinity;
  if (!sig.quote || !price) block("Data freshness", "No price available — can't trade blind.");
  else if (priceAge > RULES.maxPriceAgeMin && !stockClosedOk) block("Data freshness", `Price is ${Math.round(priceAge)} min old (max ${RULES.maxPriceAgeMin}).`);
  else if (newestNewsH > RULES.maxNewsAgeHours) block("Data freshness", `Newest headline is older than ${RULES.maxNewsAgeHours} h.`);
  else pass("Data freshness", stockClosedOk ? "Market closed — using last close price." : `Price ${Math.max(0, Math.round(priceAge))} min old; news within ${RULES.maxNewsAgeHours} h.`);

  // 2. Source independence (cited, non-price sources from distinct outlets)
  const cited = sig.sources.filter((s) => p.citedSourceIds.includes(s.id) && s.kind !== "price");
  const outlets = new Set(cited.map((s) => s.outlet.toLowerCase().trim()));
  if (outlets.size < RULES.minIndependentSources)
    block("Source independence", `Only ${outlets.size} independent source${outlets.size === 1 ? "" : "s"} cited (need ${RULES.minIndependentSources}).`);
  else pass("Source independence", `${outlets.size} independent outlets: ${[...outlets].slice(0, 4).join(", ")}.`);

  // 3. Holding exists (SELL closes holdings only — no shorting)
  const held = portfolio.holdings[p.ticker];
  if (p.action === "SELL") {
    if (!held || held.qty <= 0) block("Holding exists", `No ${p.ticker} position to sell (shorting disabled).`);
    else pass("Holding exists", `Holding ${held.qty.toFixed(4)} ${p.ticker}.`);
  }

  // 4. Market hours (flag only)
  if (kind === "stock") {
    if (!usMarketOpen(now)) {
      checks.push({ rule: "Market hours", pass: true, reason: "US market closed — filled at last close.", effect: "flag" });
      flags.push("Filled at last close (market closed)");
    } else pass("Market hours", "US market open.");
  }

  if (checks.some((c) => c.effect === "block")) return { verdict: "blocked", checks, flags };

  // Resize rules
  let size = Math.max(0, p.sizeUsd);
  let resized = false;
  const total = totalValue(portfolio, prices);

  if (p.action === "BUY") {
    const maxPos = RULES.maxPositionPct * total;
    const current = positionValue(portfolio, p.ticker, price);
    const room = Math.max(0, maxPos - current);
    if (size > room) {
      checks.push({ rule: "Max position size", pass: false, reason: `$${fmt(size)} would make ${p.ticker} > ${RULES.maxPositionPct * 100}% of portfolio; resized to $${fmt(room)}.`, effect: "resize" });
      size = room; resized = true;
    } else pass("Max position size", `Position stays ≤ ${RULES.maxPositionPct * 100}% of portfolio.`);

    if (size > portfolio.cash) {
      checks.push({ rule: "Cash available", pass: false, reason: `Only $${fmt(portfolio.cash)} cash; resized.`, effect: "resize" });
      size = portfolio.cash; resized = true;
    } else pass("Cash available", `$${fmt(portfolio.cash)} cash available.`);

    if (size < RULES.minTradeUsd) {
      checks.push({ rule: "Minimum trade", pass: false, reason: `After limits only $${fmt(size)} left (min $${RULES.minTradeUsd}).`, effect: "block" });
      return { verdict: "blocked", checks, flags };
    }
    size = round2(size);
    return { verdict: resized ? "resized" : "approved", executedUsd: size, executedQty: size / price!, fillPrice: price, checks, flags };
  }

  // SELL: cap at holding value
  const holdingValue = held!.qty * price!;
  if (size > holdingValue + 0.01) {
    checks.push({ rule: "Sell ≤ holding", pass: false, reason: `Can only sell $${fmt(holdingValue)} held; resized.`, effect: "resize" });
    size = holdingValue; resized = true;
  }
  const qty = Math.min(held!.qty, size / price!);
  return { verdict: resized ? "resized" : "approved", executedUsd: round2(qty * price!), executedQty: qty, fillPrice: price, checks, flags };
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
