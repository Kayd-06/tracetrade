"use client";
import { useEffect, useRef, useState } from "react";
import { WATCHLIST, START_CASH } from "@/lib/config";
import { positionValue, totalValue } from "@/lib/portfolio";
import { usePortfolio } from "@/hooks/usePortfolio";
import { DecisionCard } from "./DecisionCard";
import { ago, clock, pct, usd } from "@/lib/format";
import { Reveal } from "./Reveal";
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
      push({ kind: "error", message: `Couldn't complete the run. Try again. (${e instanceof Error ? e.message : e})` });
    } finally {
      setRunning(false);
    }
  }

  const runRef = useRef(run);
  useEffect(() => { runRef.current = run; });
  useEffect(() => {
    const on = () => runRef.current();
    window.addEventListener("tracetrade:run", on);
    return () => window.removeEventListener("tracetrade:run", on);
  }, []);

  if (!portfolio) return <section id="terminal" className="min-h-[600px] border-t border-line" />;
  const prices: Partial<Record<Ticker, number>> = Object.fromEntries(Object.entries(quotes).map(([k, q]) => [k, q!.price]));
  const total = totalValue(portfolio, prices);
  const pnl = total - START_CASH;
  const log: Decision[] = portfolio.log;

  const counts = log.reduce((m, d) => ({ ...m, [d.verdict]: (m[d.verdict] ?? 0) + 1 }), {} as Partial<Record<Verdict, number>>);
  return (
    <section id="terminal" className="relative scroll-mt-14 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-up">Live terminal</p>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.03em]">Try it. Real data, fake money.</h2>
            <p className="text-sm text-muted md:ml-auto">Your portfolio lives in this browser only.</p>
          </div>
        </Reveal>

        <Reveal delay={100}>
        <div className="ring-card mt-10 overflow-hidden rounded-2xl border border-line bg-panel/80">
          {/* window bar */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line bg-panel2/60 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-warn/30 bg-warn/10 px-1.5 py-0.5 font-mono text-[10px] text-warn">PAPER · no real money</span>
              {aiMode && <span className="flex items-center gap-1.5 rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted"><span className={`h-1.5 w-1.5 rounded-full ${aiMode.startsWith("LIVE") ? "pulse-dot bg-up" : "bg-dim"}`} />{aiMode}</span>}
            </div>
            <Stat label="Portfolio value" value={usd(total)} />
            <Stat label="P&L" value={`${pnl >= 0 ? "+" : "−"}${usd(Math.abs(pnl))}`} sub={pct((pnl / START_CASH) * 100)} tone={pnl > 0 ? "up" : pnl < 0 ? "down" : undefined} />
            <Stat label="Last run" value={portfolio.lastRunAt ? ago(portfolio.lastRunAt) : "never"} />
            <div className="ml-auto flex items-center gap-2">
              {confirmReset ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-muted">Reset to $10,000 and clear the log?</span>
                  <button onClick={() => { reset(); setSteps([]); setConfirmReset(false); }} className="rounded-md border border-down/50 px-2.5 py-1 text-down transition hover:bg-down/10">Reset</button>
                  <button onClick={() => setConfirmReset(false)} className="rounded-md border border-line px-2.5 py-1 transition hover:bg-white/5">Cancel</button>
                </span>
              ) : (
                <button onClick={() => setConfirmReset(true)} disabled={running} className="rounded-md px-3 py-1.5 text-xs text-muted transition hover:bg-white/5 hover:text-fg disabled:opacity-40">Reset</button>
              )}
              <button onClick={run} disabled={running} className="inline-flex items-center gap-2 rounded-lg bg-up px-4 py-2 text-sm font-semibold text-bg shadow-[0_6px_24px_-6px_rgba(126,226,168,.55)] transition hover:brightness-110 active:scale-[.98] disabled:opacity-70">
                {running ? <><Spinner /> Running…</> : "▶ Run agent"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr]">
            <aside className="space-y-8 border-b border-line p-5 lg:border-b-0 lg:border-r">
              <div>
                <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Portfolio</h3>
                <Row left="Cash" right={usd(portfolio.cash)} />
                {Object.entries(portfolio.holdings).length === 0 && <p className="mt-3 text-xs text-dim">No positions yet.</p>}
                {Object.entries(portfolio.holdings).map(([t, h]) => {
                  const v = positionValue(portfolio, t as Ticker, prices[t as Ticker]);
                  const g = v - h!.qty * h!.avgCost;
                  return (
                    <div key={t} className="slide-in mt-3 font-mono text-sm">
                      <div className="flex justify-between"><span className="font-semibold">{t}</span><span className="tabular-nums">{usd(v)}</span></div>
                      <div className="mt-0.5 flex justify-between text-[11px] text-dim"><span>{h!.qty.toFixed(4)} @ {usd(h!.avgCost)}</span><span className={g >= 0 ? "text-up" : "text-down"}>{g >= 0 ? "+" : ""}{usd(g)}</span></div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-up/60 transition-all duration-700" style={{ width: `${Math.min(100, (v / total) * 100 * 5)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
              <div>
                <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Watchlist</h3>
                <ul className="space-y-0.5">
                  {WATCHLIST.map((a) => {
                    const q = quotes[a.ticker];
                    return (
                      <li key={a.ticker} className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 font-mono text-sm transition-colors hover:bg-white/[0.03]">
                        <span className="flex items-center gap-2"><span className="w-11 font-semibold">{a.ticker}</span><span className="text-[10px] text-dim">{a.kind === "crypto" ? "24/7" : q?.marketOpen ? "open" : "closed"}</span></span>
                        <span className="flex items-center gap-2 tabular-nums">{q ? usd(q.price) : <span className="shimmer inline-block h-3 w-16 rounded bg-line" />}<span className={`w-14 text-right text-[11px] ${q && q.change24h < 0 ? "text-down" : "text-up"}`}>{q ? pct(q.change24h) : ""}</span></span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            <main className="min-w-0 space-y-4 p-5">
              {(running || steps.length > 0) && (
                <div className="slide-in rounded-lg border border-line bg-bg/70 p-3.5 font-mono text-xs leading-relaxed" aria-live="polite">
                  {steps.map((s, i) => (
                    <div key={i} className={`slide-in ${s.kind === "error" ? "text-down" : s.kind === "done" ? "text-up" : s.message.startsWith("⚠") ? "text-warn" : "text-fg/75"}`}>
                      <span className="text-dim">{clock(s.time)}  </span>{s.kind === "step" ? "› " : ""}{s.message}
                    </div>
                  ))}
                  {running && <div className="blink text-up">▍</div>}
                </div>
              )}
              <div className="flex items-center gap-3">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Decision log</h3>
                {log.length > 0 && (
                  <div className="flex gap-1.5 font-mono text-[10px]">
                    {counts.approved ? <span className="rounded bg-up/10 px-1.5 py-0.5 text-up">{counts.approved} approved</span> : null}
                    {counts.resized ? <span className="rounded bg-warn/10 px-1.5 py-0.5 text-warn">{counts.resized} resized</span> : null}
                    {counts.blocked ? <span className="rounded bg-down/10 px-1.5 py-0.5 text-down">{counts.blocked} blocked</span> : null}
                    {counts.hold ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-muted">{counts.hold} hold</span> : null}
                  </div>
                )}
              </div>
              {log.length === 0 && !running && (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-line2/70 px-6 py-16 text-center">
                  <div className="font-mono text-3xl font-medium tracking-tight">$10,000.00</div>
                  <p className="mt-2 text-sm text-muted">of paper money, waiting for its first decision.</p>
                  <button onClick={run} className="mt-6 rounded-lg border border-up/40 bg-up/10 px-4 py-2 text-sm font-medium text-up transition hover:bg-up/15">▶ Run the agent</button>
                  <p className="mt-3 text-xs text-dim">Takes ~10 seconds. Reads ~56 live sources.</p>
                </div>
              )}
              {running && log.length === 0 && [0, 1, 2].map((i) => <div key={i} className="shimmer h-12 rounded-lg border border-line bg-panel" />)}
              <div className="space-y-2">
                {log.map((d) => <div key={d.id} className="slide-in"><DecisionCard d={d} /></div>)}
              </div>
            </main>
          </div>
        </div>
        </Reveal>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim">{label}</div>
      <div className={`font-mono text-sm tabular-nums ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-fg"}`}>{value}{sub && <span className="ml-1.5 text-xs opacity-80">{sub}</span>}</div>
    </div>
  );
}
function Row({ left, right }: { left: string; right: string }) {
  return <div className="flex justify-between font-mono text-sm"><span className="text-muted">{left}</span><span className="tabular-nums">{right}</span></div>;
}
function Spinner() {
  return <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
}
