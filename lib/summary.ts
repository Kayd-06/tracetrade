import type { Decision, Verdict } from "./types";

export type Summary = Record<Verdict, number>;

export function summarize(decisions: Decision[]): Summary {
  const s: Summary = { approved: 0, resized: 0, blocked: 0, hold: 0 };
  for (const d of decisions) s[d.verdict]++;
  return s;
}

export function formatSummary(s: Summary): string {
  return `${s.approved} approved · ${s.resized} resized · ${s.blocked} blocked · ${s.hold} hold`;
}

/** Run key: explicit runId, else the timestamp prefix of the id (older saved logs). */
export const runKey = (d: Decision) => d.runId ?? d.id.split("-")[0];

/** Groups a log (any order) into runs, newest run first, preserving decision order inside each run. */
export function groupRuns(log: Decision[]): { runId: string; time: string; decisions: Decision[] }[] {
  const m = new Map<string, Decision[]>();
  for (const d of log) { const k = runKey(d); if (!m.has(k)) m.set(k, []); m.get(k)!.push(d); }
  return [...m.entries()]
    .map(([runId, decisions]) => ({ runId, decisions, time: decisions.reduce((t, d) => (d.time < t ? d.time : t), decisions[0].time) }))
    .sort((a, b) => (a.time < b.time ? 1 : -1));
}
