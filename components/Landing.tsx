"use client";
import { useEffect, useRef, useState } from "react";
import { GlowCard, Reveal } from "./Reveal";
import { useCountUp, useInView, useReducedMotion } from "@/hooks/useMotion";

export const REPO_URL = "https://github.com/Kayd-06/tracetrade";
export const runAgentEvent = () => {
  document.getElementById("terminal")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.dispatchEvent(new Event("tracetrade:run"));
};

/* ------------------------------------------------------------------ Nav */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <nav className={`sticky top-0 z-50 transition-colors duration-300 ${scrolled ? "border-b border-line bg-bg/75 backdrop-blur-xl" : "border-b border-transparent"}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <a href="#" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo /> TraceTrade
        </a>
        <div className="hidden items-center gap-5 text-sm text-muted md:flex">
          <a href="#how" className="hover:text-fg transition-colors">How it works</a>
          <a href="#rules" className="hover:text-fg transition-colors">Self-check</a>
          <a href="#terminal" className="hover:text-fg transition-colors">Live terminal</a>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted hover:text-fg transition-colors"><GitHubIcon /> GitHub</a>
          <button onClick={runAgentEvent} className="rounded-md bg-fg px-3 py-1.5 text-sm font-medium text-bg transition hover:bg-white active:scale-[.98]">Run the agent</button>
        </div>
      </div>
    </nav>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#121a14" stroke="#7ee2a8" strokeOpacity=".35" />
      <path d="M5 15.5l4-4 3 3 6.5-7" fill="none" stroke="#7ee2a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18.5" cy="7.5" r="1.6" fill="#7ee2a8" />
    </svg>
  );
}
function GitHubIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>;
}

/* ------------------------------------------------------------------ Hero */
const TRACE: { t: string; c?: string }[] = [
  { t: "› fetching signals · 8 assets · 4 sources", c: "text-muted" },
  { t: "  CoinGecko ✓  Yahoo ✓  Google News ✓  Polymarket ✓", c: "text-dim" },
  { t: "› reasoning · NVDA", c: "text-muted" },
  { t: "  BUY $2,500 · conf med · cites [1] [3] [5]", c: "text-fg" },
  { t: "› self-check", c: "text-muted" },
  { t: "  ✓ fresh data   ✓ 3 independent outlets", c: "text-up" },
  { t: "  ✗ max position 20% → resized to $2,000", c: "text-warn" },
  { t: "› reasoning · TSLA", c: "text-muted" },
  { t: "  BUY $1,200 · cites [2] [4]  (same outlet)", c: "text-fg" },
  { t: "  ✗ only 1 independent source → BLOCKED", c: "text-down" },
  { t: "› done · 1 approved · 1 resized · 1 blocked", c: "text-up" },
];

function TypingTrace() {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  const [line, setLine] = useState(0);
  const [ch, setCh] = useState(0);
  useEffect(() => {
    if (!inView || reduced) return;
    const cur = TRACE[line];
    if (!cur) { const id = setTimeout(() => { setLine(0); setCh(0); }, 3200); return () => clearTimeout(id); }
    if (ch < cur.t.length) { const id = setTimeout(() => setCh((c) => c + 2), 14); return () => clearTimeout(id); }
    const id = setTimeout(() => { setLine((l) => l + 1); setCh(0); }, cur.t.startsWith("›") ? 380 : 160);
    return () => clearTimeout(id);
  }, [inView, reduced, line, ch]);
  const shown = reduced ? TRACE.length : line;
  return (
    <div ref={ref} className="ring-card overflow-hidden rounded-xl border border-line bg-panel/90 backdrop-blur">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
        <span className="ml-3 font-mono text-[11px] text-dim">tracetrade — agent run</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-up"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up" />LIVE</span>
      </div>
      <div className="h-[248px] space-y-1 px-4 py-3 font-mono text-[12.5px] leading-relaxed">
        {TRACE.slice(0, shown).map((l, i) => <div key={i} className={l.c}>{l.t}</div>)}
        {!reduced && TRACE[line] && <div className={TRACE[line].c}>{TRACE[line].t.slice(0, ch)}<span className="blink text-up">▍</span></div>}
      </div>
    </div>
  );
}

function Counter({ to, prefix = "", suffix = "", label }: { to: number; prefix?: string; suffix?: string; label: string }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.5 });
  const v = useCountUp(to, inView);
  return (
    <div ref={ref}>
      <div className="font-mono text-2xl font-medium tabular-nums tracking-tight text-fg">{prefix}{Math.round(v).toLocaleString("en-US")}{suffix}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

export function Hero() {
  return (
    <header className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 md:pt-24 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <a href="#rules" className="fade-up inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-3 py-1 text-xs text-muted transition hover:border-line2 hover:text-fg">
            <span className="rounded-full bg-warn/15 px-1.5 py-px font-mono text-[10px] text-warn">PAPER</span>
            $10,000 of fake money · zero real risk <span aria-hidden>→</span>
          </a>
          <h1 className="fade-up text-gradient mt-6 text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl" style={{ animationDelay: "80ms" }}>
            An AI trader that<br />shows its receipts.
          </h1>
          <p className="fade-up mt-5 max-w-lg text-[17px] leading-relaxed text-muted" style={{ animationDelay: "160ms" }}>
            TraceTrade reads live prices, headlines and prediction-market odds, proposes trades with <span className="text-fg">numbered citations</span>, then
            <span className="text-fg"> checks every trade against its own risk rules</span> before it executes.
          </p>
          <div className="fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
            <button onClick={runAgentEvent} className="group inline-flex items-center gap-2 rounded-lg bg-up px-5 py-2.5 text-sm font-semibold text-bg shadow-[0_0_0_1px_rgba(126,226,168,.4),0_8px_30px_-6px_rgba(126,226,168,.5)] transition hover:brightness-110 active:scale-[.98]">
              ▶ Run the agent <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
            <a href="#how" className="rounded-lg border border-line bg-panel/50 px-5 py-2.5 text-sm text-fg/90 transition hover:border-line2 hover:bg-panel">See how it works</a>
          </div>
          <div className="fade-up mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6" style={{ animationDelay: "320ms" }}>
            <Counter to={10000} prefix="$" label="paper cash" />
            <Counter to={56} label="sources per run" />
            <Counter to={9} label="self-check rules" />
          </div>
        </div>
        <div className="fade-up relative" style={{ animationDelay: "200ms" }}>
          <div className="absolute -inset-8 -z-10 rounded-[32px] bg-up/5 blur-3xl" />
          <TypingTrace />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ Marquee */
const SOURCES = ["CoinGecko", "Yahoo Finance", "Google News", "Polymarket", "Gemini", "Groq", "Reuters", "CNBC", "Bloomberg", "CoinDesk"];
export function SourceMarquee() {
  const row = [...SOURCES, ...SOURCES];
  return (
    <section aria-label="Data sources" className="border-y border-line bg-panel/30 py-5">
      <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-dim">Reads from free, public sources — every claim cited</p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="marquee flex w-max gap-12 pr-12">
          {row.map((s, i) => <span key={i} className="whitespace-nowrap text-lg font-medium tracking-tight text-muted/70">{s}</span>)}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Pipeline scrollytelling */
const STEPS = [
  { k: "01", title: "Gather signals", body: "Live prices from CoinGecko and Yahoo Finance, the latest headlines from Google News, and Polymarket odds — for 8 assets, every run. Each source gets an ID.", tag: "signals" },
  { k: "02", title: "Reason with citations", body: "Gemini (free tier, with Groq as fallback) proposes BUY, SELL or HOLD and must cite source IDs. Any citation that wasn't actually fetched is caught and dropped.", tag: "reasoning" },
  { k: "03", title: "Self-check every trade", body: "Deterministic rules — not the model — decide: stale data or a single outlet blocks the trade; oversized trades are resized to 20% of the portfolio.", tag: "check" },
  { k: "04", title: "Execute on paper, keep the receipt", body: "Approved trades fill at the fetched price. Every decision keeps its sources, reasoning and check results, so you can audit exactly why it happened.", tag: "execute" },
];

function StepVisual({ i }: { i: number }) {
  const panes = [
    <div key="0" className="space-y-2">
      {[["NVDA-PX", "price", "$212.21 · Yahoo", "up"], ["NVDA-N2", "news", "Nvidia earnings preview · CNBC", ""], ["NVDA-N4", "news", "Is it time to buy? · Motley Fool", ""], ["NVDA-P1", "odds", "NVDA above $200 Friday · 81%", "warn"]].map(([id, k, t, c]) => (
        <div key={id} className="flex items-center gap-3 rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm">
          <span className="font-mono text-[10px] text-dim w-16">{id}</span>
          <span className={`font-mono text-[10px] uppercase w-10 ${c === "up" ? "text-up" : c === "warn" ? "text-warn" : "text-muted"}`}>{k}</span>
          <span className="truncate text-fg/85">{t}</span>
        </div>
      ))}
    </div>,
    <div key="1" className="rounded-lg border border-line bg-bg/60 p-4 text-sm leading-relaxed">
      <div className="mb-2 flex items-center gap-2 font-mono text-xs"><span className="text-up font-semibold">BUY $2,500</span><span className="text-dim">conf: med</span></div>
      <p className="text-fg/85">Shares pulled back to $212 <span className="font-mono text-xs text-up">[1]</span> ahead of earnings, where analysts expect strong data-center demand <span className="font-mono text-xs text-up">[2]</span> <span className="font-mono text-xs text-up">[3]</span>. Prediction markets price 81% odds it holds $200 <span className="font-mono text-xs text-up">[4]</span>.</p>
      <p className="mt-3 font-mono text-[11px] text-down">citation check: dropped NVDA-N9 (never fetched)</p>
    </div>,
    <div key="2" className="space-y-1.5 font-mono text-[12.5px]">
      {[["✓", "Data freshness", "price 2m old", "text-up"], ["✓", "Source independence", "3 outlets", "text-up"], ["✓", "Holding exists", "n/a for BUY", "text-up"], ["✗", "Max position 20%", "$2,500 → $2,000", "text-warn"], ["✓", "Cash available", "$10,000", "text-up"], ["✓", "Min trade $100", "ok", "text-up"]].map(([s, r, d, c]) => (
        <div key={r} className="flex items-center gap-3 rounded-md border border-line bg-bg/60 px-3 py-2"><span className={c}>{s}</span><span className="text-fg/90">{r}</span><span className="ml-auto text-dim">{d}</span></div>
      ))}
    </div>,
    <div key="3" className="rounded-lg border border-line border-l-4 border-l-warn bg-bg/60 p-4">
      <div className="flex items-center gap-3 font-mono text-sm"><span className="font-semibold">NVDA</span><span className="text-up">BUY $2,500</span><span className="text-warn">→ $2,000</span><span className="ml-auto rounded bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn">RESIZED</span></div>
      <p className="mt-2 text-sm text-fg/80">Pullback into earnings with independent bullish coverage.</p>
      <p className="mt-3 font-mono text-[11px] text-dim">Filled 9.424721 NVDA @ $212.21 = $2,000.00 (paper) · 4 sources · 6 checks</p>
    </div>,
  ];
  return <div className="relative">{panes.map((p, j) => <div key={j} className={`transition-all duration-500 ${j === i ? "relative opacity-100 translate-y-0" : "pointer-events-none absolute inset-x-0 top-0 opacity-0 translate-y-3"}`}>{p}</div>)}</div>;
}

export function Pipeline() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); }), { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-28">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-up">How it works</p>
        <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em]">Four steps. Every one leaves a receipt.</h2>
      </Reveal>
      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        <div>
          {STEPS.map((s, i) => (
            <div key={s.k} data-i={i} ref={(el) => { refs.current[i] = el; }} className="flex min-h-[40vh] flex-col justify-center lg:min-h-[50vh]">
              <div className={`transition-all duration-500 ${active === i ? "opacity-100" : "opacity-30"}`}>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm ${active === i ? "text-up" : "text-dim"}`}>{s.k}</span>
                  <span className={`h-px flex-1 transition-all duration-700 ${active === i ? "bg-up/50" : "bg-line"}`} />
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-3 max-w-md leading-relaxed text-muted">{s.body}</p>
                <div className="mt-6 lg:hidden"><StepVisual i={i} /></div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-[22vh]">
            <div className="ring-card rounded-xl border border-line bg-panel/80 p-5">
              <div className="mb-4 flex items-center gap-2">
                {STEPS.map((s, i) => <span key={s.k} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= active ? "bg-up" : "bg-line"}`} />)}
              </div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-dim">{STEPS[active].tag}</p>
              <StepVisual i={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Rules */
const RULES_UI = [
  { k: "block", t: "Fresh data only", d: "Prices older than 15 minutes or headlines older than 48 hours block the trade." },
  { k: "block", t: "Two independent outlets", d: "At least two different publishers must back a trade. The price feed doesn't count." },
  { k: "block", t: "No shorting", d: "SELL only closes or trims something the portfolio actually holds." },
  { k: "resize", t: "20% position cap", d: "No single asset can exceed a fifth of the portfolio — oversized trades are cut down." },
  { k: "resize", t: "Cash on hand", d: "Trades are trimmed to available cash; anything under $100 is blocked." },
  { k: "verify", t: "Citation verification", d: "If the AI cites a source that was never fetched, the citation is dropped and shown." },
];
export function Rules() {
  const tone = { block: "text-down bg-down/10", resize: "text-warn bg-warn/10", verify: "text-up bg-up/10" } as const;
  return (
    <section id="rules" className="scroll-mt-16 border-t border-line bg-panel/20">
      <div className="mx-auto max-w-6xl px-5 py-28">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-up">The self-check</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em]">The model proposes. <span className="text-muted">The rules decide.</span></h2>
          <p className="mt-4 max-w-xl text-muted">Risk rules are plain code, unit-tested and deterministic — so a confident-sounding model can never talk its way past them.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RULES_UI.map((r, i) => (
            <Reveal key={r.t} delay={i * 70}>
              <GlowCard className="h-full p-5">
                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone[r.k as keyof typeof tone]}`}>{r.k}</span>
                <h3 className="mt-4 font-medium tracking-tight">{r.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{r.d}</p>
              </GlowCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-8 text-sm text-muted">
        <span className="flex items-center gap-2 text-fg"><Logo size={18} /> TraceTrade</span>
        <span>Paper trading only · not financial advice</span>
        <a href={REPO_URL} className="ml-auto hover:text-fg">MIT · GitHub</a>
      </div>
    </footer>
  );
}

/** Page-wide soft cursor glow (disabled for reduced motion / touch). */
export function CursorGlow() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const on = (e: PointerEvent) => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { document.documentElement.style.setProperty("--mx", `${e.clientX}px`); document.documentElement.style.setProperty("--my", `${e.clientY}px`); }); };
    window.addEventListener("pointermove", on, { passive: true });
    return () => { window.removeEventListener("pointermove", on); cancelAnimationFrame(raf); };
  }, [reduced]);
  return <div className="page-glow" aria-hidden />;
}
