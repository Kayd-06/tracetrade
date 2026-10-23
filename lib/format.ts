export const usd = (n: number, d = 2) => `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
export const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
export function ago(iso: string, now = Date.now()): string {
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 48) return `${h}h ago`; return `${Math.round(h / 24)}d ago`;
}
export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
