"use client";
import { useState } from "react";
import type { Decision } from "@/lib/types";
import { ago, clock, usd } from "@/lib/format";

const VERDICT: Record<Decision["verdict"], { label: string; cls: string; border: string }> = {
  approved: { label: "APPROVED", cls: "bg-up/15 text-up", border: "border-l-up" },
  resized: { label: "RESIZED", cls: "bg-warn/15 text-warn", border: "border-l-warn" },
  blocked: { label: "BLOCKED", cls: "bg-down/15 text-down", border: "border-l-down" },
  hold: { label: "HOLD", cls: "bg-white/5 text-muted", border: "border-l-line" },
};
const ACTION_CLS = { BUY: "text-up", SELL: "text-down", HOLD: "text-muted" } as const;

/** Turn [BTC-N2] markers into numbered links. */
function Reasoning({ d }: { d: Decision }) {
  const idx = new Map(d.sources.map((s, i) => [s.id, i + 1]));
  // Handles [BTC-N2] and grouped [BTC-N2, BTC-N3]
  const parts = d.proposal.reasoning.split(/(\[[A-Z]+-[A-Z0-9]+(?:\s*,\s*[A-Z]+-[A-Z0-9]+)*\])/g);
  return (
    <p className="leading-relaxed text-fg/90">
      {parts.map((p, i) => {
        const m = p.match(/^\[([A-Z0-9,\s-]+)\]$/);
        if (!m) return <span key={i}>{p}</span>;
        return (
          <span key={i}>
            {m[1].split(/\s*,\s*/).map((id, k) => {
              const n = idx.get(id);
              return n ? <a key={k} href={`#src-${d.id}-${n}`} className="font-mono text-xs text-up hover:underline">[{n}]</a> : <span key={k} className="font-mono text-xs text-down line-through" title="Citation not in fetched sources, so it was dropped">[?]</span>;
            })}
          </span>
        );
      })}
    </p>
  );
}

export function DecisionCard({ d }: { d: Decision }) {
  const [open, setOpen] = useState(false);
  const v = VERDICT[d.verdict];
  const p = d.proposal;
  const blockReason = d.checks.find((c) => c.effect === "block" && !c.pass)?.reason;
  const resizeReason = d.checks.filter((c) => c.effect === "resize").map((c) => c.rule).join(", ");
  const cited = new Set(p.citedSourceIds);

  if (d.verdict === "hold" && !open) {
    return (
      <button onClick={() => setOpen(true)} className={`w-full text-left border border-line border-l-4 ${v.border} bg-panel/60 px-3 py-2 flex items-center gap-3 text-sm hover:bg-panel`}>
        <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-dim w-[74px]">{clock(d.time)}</span>
        <span className="font-mono font-semibold w-12">{p.ticker}</span>
        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${v.cls}`}>HOLD</span>
        <span className="text-muted truncate">{p.thesis}</span>
      </button>
    );
  }

  return (
    <article className={`border border-line border-l-4 ${v.border} bg-panel`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left px-3 py-2.5 hover:bg-white/[0.02]" aria-expanded={open}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-dim w-[74px]">{clock(d.time)}</span>
          <span className="font-mono font-semibold w-12">{p.ticker}</span>
          <span className={`font-mono font-semibold ${ACTION_CLS[p.action]} ${d.verdict === "blocked" ? "line-through opacity-70" : ""}`}>
            {p.action} {p.action !== "HOLD" && usd(p.sizeUsd, 0)}
          </span>
          {d.verdict === "resized" && <span className="font-mono text-warn">→ {usd(d.executedUsd ?? 0, 0)}</span>}
          <span className="font-mono text-xs text-muted">conf: {p.confidence}</span>
          <span className={`ml-auto font-mono text-xs px-1.5 py-0.5 rounded ${v.cls}`}>{v.label}</span>
          {d.aiMode === "mock" && <span className="font-mono text-[10px] px-1 rounded bg-white/5 text-muted">MOCK AI</span>}
          <span className="text-muted text-xs">{open ? "▾" : "▸ receipts"}</span>
        </div>
        <p className="mt-1 text-sm text-fg/80">{p.thesis}</p>
        {d.verdict === "blocked" && blockReason && <p className="mt-1 text-sm text-down font-medium">Blocked: {blockReason}</p>}
        {d.verdict === "resized" && <p className="mt-1 text-sm text-warn">Proposed {usd(p.sizeUsd, 0)} → executed {usd(d.executedUsd ?? 0, 0)} ({resizeReason})</p>}
      </button>

      {open && (
        <div className="border-t border-line px-3 py-3 space-y-4 text-sm">
          <section>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted mb-1">Reasoning</h4>
            <Reasoning d={d} />
            {d.droppedCitations.length > 0 && <p className="mt-1 text-xs text-down">Citation check: dropped {d.droppedCitations.length} ID(s) the AI cited that were never fetched ({d.droppedCitations.join(", ")}).</p>}
            {d.aiNote && <p className="mt-1 text-xs text-warn">{d.aiNote}</p>}
            {d.aiModel && <p className="mt-1 font-mono text-[10px] text-muted">model: {d.aiModel}</p>}
          </section>
          <section>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted mb-1">Sources</h4>
            <ol className="space-y-1">
              {d.sources.map((s, i) => (
                <li key={s.id} id={`src-${d.id}-${i + 1}`} className={`flex gap-2 ${cited.has(s.id) ? "" : "opacity-50"}`}>
                  <span className="font-mono text-xs text-muted w-6 shrink-0">[{i + 1}]</span>
                  <span className="font-mono text-[10px] uppercase w-14 shrink-0 text-muted pt-0.5">{s.kind === "polymarket" ? "odds" : s.kind}</span>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline flex-1">{s.title}</a>
                  <span className="text-xs text-muted shrink-0">{s.outlet} · {ago(s.time)}</span>
                  {cited.has(s.id) && <span className="font-mono text-[10px] text-up shrink-0 pt-0.5">CITED</span>}
                </li>
              ))}
            </ol>
            {d.flags.filter((f) => f.startsWith("Missing")).map((f) => <p key={f} className="text-xs text-warn mt-1">{f}</p>)}
          </section>
          {d.checks.length > 0 && (
            <section>
              <h4 className="font-mono text-xs uppercase tracking-wider text-muted mb-1">Self-check</h4>
              <table className="w-full text-xs">
                <tbody>
                  {d.checks.map((c, i) => (
                    <tr key={i} className="border-t border-line/60">
                      <td className={`py-1 pr-2 font-mono w-5 ${c.pass ? (c.effect === "flag" ? "text-warn" : "text-up") : c.effect === "resize" ? "text-warn" : "text-down"}`}>{c.pass ? (c.effect === "flag" ? "!" : "✓") : "✗"}</td>
                      <td className="py-1 pr-3 font-mono whitespace-nowrap">{c.rule}</td>
                      <td className="py-1 text-fg/80">{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {d.fillPrice && (d.verdict === "approved" || d.verdict === "resized") && (
            <p className="font-mono text-xs text-muted">Filled {(d.executedQty ?? 0).toFixed(6)} {p.ticker} @ {usd(d.fillPrice)} = {usd(d.executedUsd ?? 0)} (paper)</p>
          )}
        </div>
      )}
    </article>
  );
}
