"use client";
import { useEffect, useRef, useState } from "react";
import { WATCHLIST, START_CASH } from "@/lib/config";
import { positionValue, totalValue } from "@/lib/portfolio";
import { usePortfolio } from "@/hooks/usePortfolio";
import { DecisionCard } from "./DecisionCard";
import { ago, clock, pct, usd } from "@/lib/format";
import type { Decision, Quote, RunEvent, Ticker, Verdict } from "@/lib/types";

type Step = { time: string; message: string; kind: "step" | "error" | "done" };
type Quotes = Partial<Record<Ticker, Quote>>;

export function Dashboard() {
  const { portfolio, apply, markRun, reset } = usePortfolio();
  const [quotes, setQuotes] = useState<Quotes>({});
  const [aiMode, setAiMode] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const traceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/prices").then((r) => r.json()).then((j) => { setQuotes(j.quotes ?? {}); setAiMode(j.aiMode === "mock" ? "MOCK AI" : `LIVE · ${j.provider}`); }).catch(() => {});
  }, []);

  async function run() {
    if (!portfolio || running) return;
    setRunning(true);
    setSteps([]);
    const push = (s: Omit<Step, "time">) => setSteps((x) => [...x, { ...s, time: new Date().toISOString() }]);
    try {
      const res = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portfolio }) });
      if (!res.body) throw new Error("no response body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as RunEvent;
          if (ev.type === "step") push({ kind: "step", message: ev.message });
          else if (ev.type === "error") push({ kind: "error", message: ev.message });
          else if (ev.type === "decision") {
            apply(ev.decision);
            if (ev.decision.fillPrice) setQuotes((q) => ({ ...q, [ev.decision.proposal.ticker]: { ...(q[ev.decision.proposal.ticker] as Quote), price: ev.decision.fillPrice! } }));
          } else if (ev.type === "done") {
            markRun();
            const s = ev.summary as Record<Verdict, number>;
            push({ kind: "done", message: ev.message ?? `Done: ${s.approved} approved · ${s.resized} resized · ${s.blocked} blocked · ${s.hold} hold` });
          }
        }
      }
    } catch (e) {
      push({ kind: "error", message: `Couldn't complete the run — try again. (${e instanceof Error ? e.message : e})` });
    } finally {
      setRunning(false);
    }
  }

  if (!portfolio) return <main className="p-8 font-mono text-muted">Loading…</main>;
  const prices: Partial<Record<Ticker, number>> = Object.fromEntries(Object.entries(quotes).map(([k, q]) => [k, q!.price]));
  const total = totalValue(portfolio, prices);
  const pnl = total - START_CASH;
  const log: Decision[] = portfolio.log;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header className="border-b border-line bg-panel px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-up">▲ TraceTrade</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-warn/50 text-warn">PAPER — no real money</span>
          {aiMode && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-line text-muted">{aiMode}</span>}
        </div>
        <div className="font-mono text-sm"><span className="text-muted">Value </span>{usd(total)}</div>
        <div className={`font-mono text-sm ${pnl >= 0 ? "text-up" : "text-down"}`}>{pnl >= 0 ? "+" : ""}{usd(pnl)} ({pct((pnl / START_CASH) * 100)})</div>
        <div className="font-mono text-xs text-muted">Last run: {portfolio.lastRunAt ? ago(portfolio.lastRunAt) : "never"}</div>
        <div className="ml-auto flex items-center gap-2">
          {confirmReset ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-muted">Reset to $10,000 and clear the log?</span>
              <button onClick={() => { reset(); setSteps([]); setConfirmReset(false); }} className="px-2 py-1 border border-down text-down rounded">Yes, reset</button>
              <button onClick={() => setConfirmReset(false)} className="px-2 py-1 border border-line rounded">Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmReset(true)} disabled={running} className="px-3 py-1.5 text-xs border border-line rounded text-muted hover:text-fg disabled:opacity-40">Reset</button>
          )}
          <button onClick={run} disabled={running} className="px-4 py-1.5 font-mono text-sm font-semibold rounded bg-up text-bg hover:brightness-110 disabled:opacity-60">
            {running ? "Running…" : "▶ Run agent"}
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-px bg-line">
        {/* Left: portfolio + watchlist */}
        <aside className="bg-bg p-4 space-y-6">
          <section>
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted mb-2">Portfolio</h2>
            <div className="font-mono text-sm flex justify-between"><span>Cash</span><span>{usd(portfolio.cash)}</span></div>
            {Object.entries(portfolio.holdings).length === 0 && <p className="text-xs text-muted mt-2">No positions yet.</p>}
            {Object.entries(portfolio.holdings).map(([t, h]) => {
              const v = positionValue(portfolio, t as Ticker, prices[t as Ticker]);
              const g = v - h!.qty * h!.avgCost;
              return (
                <div key={t} className="font-mono text-sm mt-1.5">
                  <div className="flex justify-between"><span className="font-semibold">{t}</span><span>{usd(v)}</span></div>
                  <div className="flex justify-between text-xs text-muted"><span>{h!.qty.toFixed(4)} @ {usd(h!.avgCost)}</span><span className={g >= 0 ? "text-up" : "text-down"}>{g >= 0 ? "+" : ""}{usd(g)}</span></div>
                </div>
              );
            })}
          </section>
          <section>
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted mb-2">Watchlist</h2>
            <ul className="space-y-1">
              {WATCHLIST.map((a) => {
                const q = quotes[a.ticker];
                return (
                  <li key={a.ticker} className="font-mono text-sm flex justify-between gap-2">
                    <span><span className="font-semibold">{a.ticker}</span> <span className="text-[10px] text-muted">{a.kind === "crypto" ? "24/7" : q?.marketOpen ? "open" : "closed"}</span></span>
                    <span>{q ? usd(q.price) : <span className="text-muted">—</span>} <span className={`text-xs ${q && q.change24h < 0 ? "text-down" : "text-up"}`}>{q ? pct(q.change24h) : ""}</span></span>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>

        {/* Right: trace */}
        <main className="bg-bg p-4 space-y-4 min-w-0" ref={traceRef}>
          {(running || steps.length > 0) && (
            <section className="border border-line bg-panel p-3 font-mono text-xs space-y-1" aria-live="polite">
              {steps.map((s, i) => (
                <div key={i} className={s.kind === "error" ? "text-down" : s.kind === "done" ? "text-up" : s.message.startsWith("⚠") ? "text-warn" : "text-fg/80"}>
                  <span className="text-muted">{clock(s.time)} </span>{s.kind === "step" ? "› " : ""}{s.message}
                </div>
              ))}
              {running && <div className="text-up blink">▍</div>}
            </section>
          )}
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted">Agent trace</h2>
          {log.length === 0 && !running && (
            <div className="border border-dashed border-line p-8 text-center">
              <p className="text-lg">You have $10,000 of paper money.</p>
              <p className="text-muted mt-1 text-sm">Press <span className="font-mono text-up">▶ Run agent</span>. The AI reads live prices, news and prediction-market odds, proposes trades with citations, then checks each one against its risk rules before it executes.</p>
            </div>
          )}
          <div className="space-y-2">
            {log.map((d) => <DecisionCard key={d.id} d={d} />)}
          </div>
        </main>
      </div>
    </div>
  );
}
