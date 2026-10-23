---
doc: spec
status: approved
---

# TraceTrade: Technical Spec

> **(proposed)** marks agent recommendations awaiting Kunal's agreement. Data sources were checked with curl from the build box on 23 Oct 2026, 2:30 PM IST.

## How This Works, In Plain Language
TraceTrade is one Next.js web app with two halves:
- **The browser (dashboard)** shows everything and *remembers your paper portfolio* in the browser's localStorage, so there's no database and no login.
- **One server route (`/api/run`)** does the agent work when you press Run: it fetches free market data (prices, Google News headlines, Polymarket odds), asks a free Gemini model (Groq as backup) for a decision per asset with cited sources, and streams progress back.
- **The self-check** is a plain TypeScript function (no AI) that compares each proposed trade with fixed rules and returns *approved*, *resized* or *blocked* with reasons. Because it's ordinary code, it's predictable and testable: the AI proposes, the rules decide.
Why this shape: it's the smallest thing that proves the kernel. One page, one route, no database, and the API key stays on the server.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. Kunal opens the page → the dashboard loads the portfolio from localStorage (or creates $10,000 cash) and fetches `/api/prices` for the watchlist.
2. He clicks **Run agent** → the browser POSTs the current portfolio to `/api/run`.
3. The route gathers signals for all 8 assets in parallel (prices, news, Polymarket) and streams `step` events → the trace panel updates.
4. For each asset, the route sends the signals (each with a numbered source ID) to the LLM and asks for strict JSON: action, size, confidence, thesis, reasoning, cited source IDs.
5. The route runs `selfCheck(proposal, portfolio, signals)` → verdict + rule results, and streams a `decision` event.
6. The browser applies approved/resized fills to the portfolio, saves it to localStorage, and adds the decision card. Blocked decisions are logged only.
7. A final `done` event carries the run summary.

## Stack
- **Next.js (App Router) + TypeScript:** Kunal already shipped Seller Studio on Next.js + Vercel; reuses known skills. https://nextjs.org/docs (pin current stable at build).
- **Tailwind CSS:** fast terminal styling. https://tailwindcss.com/docs
- **OpenAI SDK pointed at Google Gemini (free tier)** via its OpenAI-compatible endpoint `https://generativelanguage.googleapis.com/v1beta/openai/`, key `GEMINI_API_KEY` (free from Google AI Studio). Kunal wants everything free. https://ai.google.dev/gemini-api/docs/openai
- **Fallback: Groq free tier** (OpenAI-compatible, `https://api.groq.com/openai/v1`, key `GROQ_API_KEY`). https://console.groq.com/docs/openai
- **Override:** `LLM_BASE_URL` + `LLM_MODEL` (+ `LLM_API_KEY`) for any OpenAI-compatible provider.
- **Mock mode:** with no key (or `MOCK_LLM=1`) a deterministic rule-based "mock agent" produces decisions from the real signals, so the UI is demoable/testable for free; the UI labels it "MOCK AI".
- **fast-xml-parser** for Google News RSS. https://github.com/NaturalIntelligence/fast-xml-parser
- **zod** to validate the model's JSON. https://zod.dev
- **Vitest** for self-check unit tests. https://vitest.dev
- Model ids: default `gemini-3.8-flash` (the model named in Google's OpenAI-compat docs, 23 Oct 2026) and `llama-3.3-70b-versatile` for Groq, both **unverified without a key**; override with `LLM_MODEL`. Check free-tier availability via `GET /models` once a key exists.

## Where It Runs and How Someone Tries It
- Local: Node 20+, `npm install`, copy `.env.example` → `.env.local`, set keys, `npm run dev`, open http://localhost:3000.
- Deploy: Vercel (CLI, as with Seller Studio), env vars set in the Vercel project; `vercel --prod`. Route needs `maxDuration` ≈ 60 s.
- Demo recording: the live Vercel URL; click Run, expand one approved and one blocked/resized card.
- Submission needs the demo video + public GitHub repo (with `devpost/scope.md`, `prd.md`, `spec.md`); deployment is a bonus.

## Look and Feel
From `prd.md > Look and Feel`: background `#0b0e11`, panels `#121820`, borders `#222a33`, text `#d6dde6`; green `#7ee2a8` (BUY/approved), red `#ff7b84` (SELL/blocked), amber `#ffc457` (resized/warning), grey (HOLD). Numbers/tickers in a monospace font (JetBrains Mono via `next/font`), prose in Inter. Dense, timestamped, audit-log feel; terse copy ("Blocked: only 1 independent source"). No gradients, no emoji icons.

## Components

### Dashboard page
Layout from `prd.md > Screens and Layout`: top bar, portfolio + watchlist (left), trace + decision log (right); stacks on mobile.

### Portfolio store
`usePortfolio` hook: load/save localStorage, `applyFill`, `reset` (with confirm). PRD ref: `prd.md > Portfolio`.

### Run client
Reads the streamed NDJSON from `/api/run`, drives trace + log, disables Run while running. PRD ref: `prd.md > Running the agent`.

### Decision card & receipts
Collapsed card fields and expanded receipts (reasoning with [n] links, sources, rule table, fill). PRD ref: `prd.md > Decisions and receipts`.

### Signal fetchers (server)
`prices.ts` (CoinGecko + Yahoo), `news.ts` (Google News RSS), `polymarket.ts` (Gamma search). Each returns items with `id`, `source`, `url`, `fetchedAt/publishedAt`; failures return `{error}` not throws. PRD ref: `prd.md > Signals`.

### Agent (server)
Builds the prompt per asset, calls the LLM with JSON output, validates with zod, retries once on bad JSON, else HOLD with "AI response invalid". Rejects cited IDs that don't exist. PRD ref: `prd.md > Decisions and receipts`.

### Self-check (shared)
Pure function, thresholds in `config.ts`: max position 20%, ≥2 independent sources (distinct outlets), price ≤15 min / headlines ≤48 h, cash (resize; block < $100), SELL needs holding (no shorting), stock trade while US market closed → fill at last close, amber flag. Order: block rules first, then resize. PRD ref: `prd.md > Self-check (the kernel)`.

### Run route
`POST /api/run` orchestrates fetch → agent → self-check and streams events. Prices are fetched once per run.

## Data Model
```ts
Portfolio  { cash: number; holdings: Record<Ticker,{qty:number; avgCost:number}>; log: Decision[]; updatedAt: string } // localStorage "tracetrade:v1"
Source     { id: string; kind: 'price'|'news'|'polymarket'; title: string; outlet: string; url: string; time: string }
Proposal   { ticker; action:'BUY'|'SELL'|'HOLD'; sizeUsd:number; confidence:'low'|'med'|'high'; thesis:string; reasoning:string; citedSourceIds:string[] }
CheckResult{ rule:string; pass:boolean; reason:string }
Decision   { id; time; proposal: Proposal; sources: Source[]; checks: CheckResult[]; verdict:'approved'|'resized'|'blocked'|'hold'; executedUsd?:number; fillPrice?:number; flags:string[] }
```
The server is stateless; the browser sends the portfolio with each run and owns persistence. Clearing browser data = fresh $10,000.

## File Structure
```
ai-basics/
├── app/
│   ├── page.tsx              # dashboard
│   ├── layout.tsx, globals.css
│   └── api/
│       ├── run/route.ts      # streaming agent run
│       └── prices/route.ts   # watchlist prices on load
├── components/               # TopBar, Portfolio, Watchlist, AgentTrace, DecisionCard
├── lib/
│   ├── config.ts             # watchlist, thresholds, start cash
│   ├── types.ts
│   ├── portfolio.ts          # applyFill, valuation (pure)
│   ├── selfCheck.ts          # rules (pure) + selfCheck.test.ts
│   ├── agent.ts              # prompt + LLM call + zod
│   └── signals/{prices,news,polymarket}.ts
├── hooks/usePortfolio.ts
├── .env.example              # GEMINI_API_KEY=, GROQ_API_KEY=, LLM_*, MOCK_LLM=
├── README.md, LICENSE (MIT)
└── devpost/                  # scope, prd, spec (+ html); learner-profile gitignored
```

## External Services and Dependencies
All verified from the box on 23 Oct 2026 unless noted.
| Use | Call | Result | Key | Notes |
|---|---|---|---|---|
| Crypto prices | `GET api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true` | ✅ 200 | none | ~5-15 req/min free; one call per run. https://docs.coingecko.com |
| Stock/ETF prices | `GET query1.finance.yahoo.com/v8/finance/chart/{TICKER}?interval=1d&range=5d` → `meta.regularMarketPrice`, `chartPreviousClose`, `regularMarketTime` | ✅ 200 (needs browser User-Agent) | none | Unofficial; may rate-limit. Verify from Vercel early. |
| News | `GET news.google.com/rss/search?q={query}+when:2d&hl=en-US&gl=US&ceid=US:en` | ✅ 200 | none | Items have title, link, pubDate, source (outlet), used for independence check. Take top 5. |
| Prediction odds | `GET gamma-api.polymarket.com/public-search?q={term}&limit_per_type=5&events_status=active` → events[].markets[].outcomePrices | ✅ 200 | none | Found active BTC and NVDA markets. Pick the soonest-ending relevant market; many assets will have none ("no market found"). https://docs.polymarket.com |
| LLM | `POST generativelanguage.googleapis.com/v1beta/openai/chat/completions` | not tested (no key) | `GEMINI_API_KEY` | Free tier, rate-limited (RPM/RPD); ~8 calls/run. Fallback Groq `api.groq.com/openai/v1` with `GROQ_API_KEY` (free tier). |
| Hosting | Vercel | n/a | Vercel login | Free Hobby plan. |
Rejected: **Binance** (HTTP 451, region-restricted from this box), **Stooq** (404 on the CSV endpoint).

## Important Failure Modes
- **Yahoo blocks/rate-limits (esp. from Vercel)** → those stocks show "price unavailable" and are skipped (HOLD, freshness fail); crypto still runs. Fallback option: a keyed free API (e.g. Finnhub) if verification on Vercel fails.
- **LLM error or invalid JSON** → one retry, then HOLD "AI unavailable"; if all fail, run ends with "Couldn't reach the AI. Try again", portfolio untouched.
- **No Polymarket market / news thin** → shown as missing source; the independence rule may block, which is the intended behaviour.
- **Vercel timeout** → assets processed in parallel with per-call timeouts (≈10 s), streaming keeps the response alive.

## What Was Simplified and Why
- **localStorage** instead of a database: one user, one device; no accounts needed. Fuller: Postgres + auth.
- **Rule-based self-check** instead of an AI critic: predictable and testable. Fuller: add an LLM second opinion.
- **Manual runs** instead of scheduled: confirmed by Kunal; demos better. Fuller: Vercel Cron + stored state.
- **Fills at last price, no slippage/fees:** enough to prove the kernel.
- **Market-hours check uses fixed US hours (9:30-16:00 ET, weekdays)**, ignoring holidays.

## Decisions and Open Issues
- Confirmed by Kunal (PRD): manual runs only; SELL only closes holdings; 8-asset watchlist; $10k paper cash; terminal look.
- Approved by Kunal (conditional on everything being free): Next.js on Vercel, localStorage portfolio, one streaming route; free data sources (CoinGecko, Yahoo chart, Google News RSS, Polymarket Gamma); MIT licence.
- LLM: Gemini free tier (default) → Groq free tier (fallback) → `LLM_BASE_URL`/`LLM_MODEL` override → mock mode with no key. xAI dropped because its API is paid.
- **Learner uncertainty:** asked what he was least sure about, Kunal said "idk". Agent-proposed main uncertainty: **can we trust the AI's citations?** Investigation in build: agent code drops any cited source ID that wasn't actually fetched; a Vitest test proves it; the UI notes dropped citations.
- Open: verify model ids with a real key; verify Yahoo works from Vercel after deploy; Kunal adds `GEMINI_API_KEY` (optionally `GROQ_API_KEY`) to `.env.local` and Vercel himself.

## Sharing

- Public repo: https://github.com/Kayd-06/tracetrade (MIT)
- Demo video: _TBD_
- Live app (optional): _TBD_
