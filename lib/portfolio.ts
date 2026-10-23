import { START_CASH } from "./config";
import type { Decision, PortfolioState, Ticker } from "./types";

export function freshPortfolio(): PortfolioState {
  return { cash: START_CASH, holdings: {}, log: [], updatedAt: new Date().toISOString() };
}

export function positionValue(p: PortfolioState, ticker: Ticker, price?: number): number {
  const h = p.holdings[ticker];
  if (!h) return 0;
  return h.qty * (price ?? h.avgCost);
}

export function totalValue(p: PortfolioState, prices: Partial<Record<Ticker, number>>): number {
  let v = p.cash;
  for (const [t, h] of Object.entries(p.holdings)) if (h) v += h.qty * (prices[t as Ticker] ?? h.avgCost);
  return v;
}

/** Apply an executed decision to the portfolio (pure). */
export function applyDecision(p: PortfolioState, d: Decision): PortfolioState {
  const next: PortfolioState = { ...p, holdings: { ...p.holdings }, log: [d, ...p.log], updatedAt: new Date().toISOString() };
  if ((d.verdict === "approved" || d.verdict === "resized") && d.executedUsd && d.fillPrice) {
    const t = d.proposal.ticker;
    const h = next.holdings[t];
    if (d.proposal.action === "BUY") {
      const qty = d.executedUsd / d.fillPrice;
      const oldQty = h?.qty ?? 0;
      const newQty = oldQty + qty;
      next.holdings[t] = { qty: newQty, avgCost: (oldQty * (h?.avgCost ?? 0) + d.executedUsd) / newQty };
      next.cash = round2(next.cash - d.executedUsd);
    } else if (d.proposal.action === "SELL" && h) {
      const qty = Math.min(h.qty, d.executedQty ?? d.executedUsd / d.fillPrice);
      const remaining = h.qty - qty;
      if (remaining * d.fillPrice < 0.01) delete next.holdings[t];
      else next.holdings[t] = { ...h, qty: remaining };
      next.cash = round2(next.cash + qty * d.fillPrice);
    }
  }
  return next;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
