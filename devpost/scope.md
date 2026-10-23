---
doc: scope
status: approved
---

# TraceTrade

An AI paper-trading agent that reads the news, social chatter, prices and prediction-market odds, decides buy/sell/hold, trades a simulated portfolio, and shows the receipts for every decision — including the trades its own risk checks stopped.

## The Unique Kernel
Every trade comes with receipts, and the agent audits itself before acting. Each decision shows its reasoning and the exact sources it used, then passes through a self-check (position size, single/unverified source, stale data…). Failing trades are **blocked or resized on screen, with the reason**. Not just "an AI that trades" — an AI whose trades you can check, and that checks itself.

## Who It's For
Someone like Kunal: a student getting into quant who wants to see how signals turn into trade decisions without risking real money. Today they read headlines, check prices and odds in separate tabs, and guess.

## The Core Loop
Open the dashboard → hit "Run agent" (or it runs on a short cycle) → the agent gathers fresh signals for the 8-asset watchlist → proposes a trade with reasoning + cited sources → self-check approves, resizes or blocks it → portfolio and trade log update. Come back to see how the paper portfolio did and why each trade happened.

## Inspiration & Identity
Inspired by a hackathon winner that connected research, decisions and execution "while keeping the reasoning behind each trade visible," and another that put reliability at the center (checking outcomes, recovering from failures). Feel: a clean trading terminal / audit trail — dense but readable.

## Why This Matters to the Learner
New interest in quant; wants to finally win a hackathon. Learning focus: agent reasoning first, plus prompt design, polished UI and shipping fast.

## What "Working" Looks Like
A hosted page where you click "Run agent" and, within seconds, watch it pull live headlines, a price and a Polymarket odds number for a ticker, propose a trade with cited sources, and then — the "oh, that's cool" beat — the self-check **blocks** an oversized or single-source trade with a red explanation, or resizes it, before the simulated portfolio updates. Every trade in the log expands to show its reasoning and source links. Demo-able in 1–3 minutes.

## The POC Boundary
- Fixed watchlist of 8 assets with free price data: BTC, ETH, SOL (crypto) and AAPL, NVDA, TSLA, MSFT, SPY (US stocks/ETF) — Kunal: "in watchlist we can add more"
- Signals from free sources: news/RSS headlines, price quotes, Polymarket public odds; social sentiment via a free source if one is reliable (see Later)
- One LLM call per decision (key via env var) returning structured action + reasoning + cited source IDs
- Rule-based self-check layer (deterministic, not another LLM): max position size, min independent sources, data freshness, cash available; outcomes approve / resize / block, with reason
- Simulated portfolio starting with fake cash ($10,000), stored simply
- One dashboard: run button, portfolio, decision log with expandable receipts, blocked-trade highlights
- Deployed on Vercel (optional for the hackathon but planned)

## Later
- Scheduled/autonomous runs in the background
- Reliable social-media sentiment (X/Reddit) if no free stable source fits now
- Performance charts and backtesting
- User-editable risk rules and watchlist
- LLM "second opinion" critic alongside the rule checks

## Explicitly Cut
- **Real brokerages/exchanges and real money** — KYC, API approvals and real financial risk; not safe or doable by Oct 26.
- **User accounts/auth** — not needed to prove the kernel.
- **Paid data feeds** — free sources only.
- **Large universe / options / leverage** — complexity that doesn't prove the kernel.
