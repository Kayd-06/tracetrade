---
doc: prd
status: approved
---

# TraceTrade — Product Requirements

An AI paper-trading agent for students getting into quant: it reads signals, proposes trades with receipts, audits itself, and trades a simulated $10,000 portfolio.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

> Items marked **(proposed)** were drafted by the agent for Kunal to confirm or change.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.
1. Kunal opens TraceTrade and lands on the single dashboard: $10,000 paper cash, the 8-asset watchlist with live prices, an empty decision log, and a prominent **Run agent** button.
2. He clicks **Run agent**. A live "agent trace" shows steps as they happen: *Gathering signals → Reasoning → Self-check → Executing*.
3. For each watchlist asset, the agent gathers recent headlines, the current price and change, and related Polymarket odds where a matching market exists.
4. The agent proposes an action per asset (BUY / SELL / HOLD, size, confidence) with written reasoning that cites the specific sources it used.
5. Every non-HOLD proposal goes through the self-check. Each rule shows pass/fail; the verdict is **Approved**, **Resized** (with the new size) or **Blocked** (with the reason).
6. Approved and resized trades are filled at the current price into the paper portfolio; blocked trades change nothing.
7. The decision log fills with one card per decision; clicking a card expands its **receipts**: reasoning, cited sources with links and timestamps, and the rule-by-rule check.
8. Success: within about a minute, the portfolio has changed, at least one trade has visible receipts, and any blocked/resized trade clearly says why.

## Screens and Layout
One screen (the dashboard). **(proposed)**
- **Top bar:** TraceTrade name, "PAPER TRADING — no real money" badge, last-run time, **Run agent** button, **Reset portfolio** link.
- **Left column:** Portfolio (cash, total value, P&L vs $10k, holdings table) above the Watchlist (8 tickers, price, 24h change).
- **Centre/right column:** Agent trace (live during a run) above the Decision log (newest first).
- **Receipts:** expand inline inside a decision card (no separate page).
- On mobile the columns stack: run bar, trace, log, then portfolio.

## Look and Feel
**(proposed — Kunal asked for "terminal/audit-trail look")**
- Dark trading-terminal style: near-black background, monospace for numbers/tickers, clean sans for prose.
- Colour carries meaning only: green = BUY/approved, red = SELL/blocked, amber = resized/warning, grey = HOLD.
- Dense but readable, like an audit log: timestamps on everything, source links visible.
- Avoid: generic purple-gradient "AI app" styling, emojis as icons, decorative charts.

## Features and Behavior

### Running the agent
- As a quant-curious student, I want to trigger the agent and watch its steps so that I understand what it's doing.
  - [ ] Clicking **Run agent** disables the button and shows the step trace progressing.
  - [ ] A full run over 8 assets finishes in under ~60 seconds and shows "Run complete" with a summary (e.g. "2 approved · 1 resized · 1 blocked · 4 hold").

### Signals
- [ ] Each asset's decision shows the signals used: price + 24h change, up to ~5 recent headlines, and Polymarket odds when a relevant market exists ("no prediction market found" otherwise).
- [ ] Every signal shows its source name, link and how old it is.
- Social sentiment is not shown (deferred per `scope.md > Later`).

### Decisions and receipts
Each decision card shows **(proposed fields)**: time, ticker, action (BUY/SELL/HOLD), proposed size ($ and % of portfolio), confidence (low/med/high), one-line thesis, verdict badge.
Expanded receipts show: full reasoning; numbered cited sources (title, outlet, link, timestamp) with reasoning referencing them as [1], [2]; the self-check table; fill price and resulting position.
- [ ] Every non-HOLD decision cites at least one source, and every cited number links to a real source item.
- [ ] HOLD decisions are listed compactly with a one-line reason.

### Self-check (the kernel)
Rule-based; the same rules every time. **(proposed defaults)**
| Rule | Fails when | Outcome |
|---|---|---|
| Max position size | Trade would make one asset > 20% of portfolio | **Resize** down to the limit |
| Source independence | Fewer than 2 independent sources support the thesis | **Block** |
| Data freshness | Price older than 15 min or all headlines older than 48 h | **Block** |
| Cash available | BUY costs more than cash | **Resize** to available cash, or block if < $100 |
| Holding exists | SELL of an asset not held | **Block** |
| Market hours | Stock trade while US market is closed | Fill at last close price, flagged amber |
- [ ] Each card shows every rule with ✓/✗ and a plain-English reason.
- [ ] A **Blocked** card has a red border, strike-through on the proposed trade and "Blocked: <reason>"; portfolio unchanged.
- [ ] A **Resized** card shows "proposed $X → executed $Y" in amber with the rule that caused it.
- [ ] In a typical run, at least one trade is blocked or resized (the demo moment).

### Portfolio
- [ ] Starts at $10,000 cash; holdings, total value and P&L update right after approved/resized trades.
- [ ] **Reset portfolio** asks for confirmation, then returns to $10,000 and clears the log.

## States and Boundaries
- **First use** — $10,000 cash, no holdings, log says "No decisions yet — run the agent to see its first trades with receipts."
- **Running** — button disabled, trace animates; a second click does nothing.
- **Partial data** — if one source fails (e.g. Polymarket), the run continues; affected decisions say which source was missing, and freshness/independence checks apply.
- **Source/AI failure** — if prices or the AI are unavailable, run stops with a clear message ("Couldn't reach price data — try again") and the portfolio is untouched.
- **All HOLD** — run completes and says "No trades this run — agent saw no strong signal", listing reasons.
- **Persistence** — portfolio and log persist between visits on the same device until Reset. **(proposed)**
- **Boundary** — paper money only; the page always shows the "no real money" badge.

## Product Decisions
- Name **TraceTrade** — confirmed by Kunal.
- Simulated portfolio only, $10,000 start — no real brokerage risk.
- Self-check is rule-based, not a second AI — predictable and explainable.
- 8-asset watchlist (BTC, ETH, SOL, AAPL, NVDA, TSLA, MSFT, SPY) — Kunal wanted more than 3–5.
- Terminal/audit-trail look — accepted by Kunal.
- Social sentiment deferred.
- Runs are manual (button), not scheduled. **(proposed)**

## What We're Building
Single dashboard; manual Run; signals (price, headlines, Polymarket odds) for 8 assets; AI decision with cited reasoning; rule-based self-check with approve/resize/block; paper portfolio with persistence and reset; expandable receipts; clear empty/error states; deployed on Vercel.

## Deferred From the POC
- Scheduled/autonomous runs — needs background jobs; manual run demos better.
- Social sentiment — no reliable free source yet.
- Editable rules/watchlist — fixed defaults prove the kernel.
- Charts/backtesting — not needed to show receipts.
- Accounts/multi-device sync — single user is enough.

## Possible Later Enhancements
- AI "second-opinion" critic alongside the rules.
- P&L chart over time and per-rule stats ("blocks saved you $X").
- Shareable link to a single decision's receipts.

## Non-Goals
- Real money, brokerages or exchanges — safety and time.
- Financial advice — the page states it's an educational simulation.
- Options, leverage, shorting — complexity without proving the kernel.
- Paid data feeds — free sources only.

## Open Questions
- Confirm self-check thresholds (20% max position, 2 sources, 15 min / 48 h freshness) — before `4-spec`.
- Confirm decision-card fields and confidence levels — before `4-spec`.
- Confirm one-screen layout and persistence on the same device — before `4-spec`.
- Confirm manual-only runs — can wait.
- Should SELL allow shorting? Proposed no — can wait.
