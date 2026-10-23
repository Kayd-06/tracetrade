"use client";
import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEY } from "@/lib/config";
import { applyDecision, freshPortfolio } from "@/lib/portfolio";
import type { Decision, PortfolioState } from "@/lib/types";

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  useEffect(() => {
    let p = freshPortfolio();
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) p = JSON.parse(raw) as PortfolioState; } catch { /* corrupted → fresh */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage (not available during SSR)
    setPortfolio(p);
  }, []);
  useEffect(() => { if (portfolio) localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); }, [portfolio]);
  const apply = useCallback((d: Decision) => setPortfolio((p) => (p ? applyDecision(p, d) : p)), []);
  const markRun = useCallback(() => setPortfolio((p) => (p ? { ...p, lastRunAt: new Date().toISOString() } : p)), []);
  const reset = useCallback(() => setPortfolio(freshPortfolio()), []);
  return { portfolio, apply, markRun, reset };
}
