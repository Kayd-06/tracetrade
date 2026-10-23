---
doc: checklist
status: approved
---
<!-- Approval: Kunal delegated the build ("build in fast mode", relayed 2026-10-23); plan approved on that basis. -->

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Press Run and watch an agent trade paper money with receipts (mock AI)**
  Becomes usable: Next.js app with portfolio, watchlist, a streaming agent trace and decision cards, all driven by live prices/news/odds and a labelled MOCK AI.
  Why now: Proves the whole path (signals → proposal → self-check → execution → trace) before any key exists.
  PRD ref: `prd.md > The Core Journey`
  Spec ref: `spec.md > Components`, `spec.md > File Structure`, `spec.md > Data Sources`
  Build: Scaffold, lib/signals, lib/selfCheck, lib/portfolio, mock agent, /api/run NDJSON stream, /api/prices, dashboard UI, localStorage.
  Verify (mechanical): `npm run build` passes; `MOCK_LLM=1 next start` + POST /api/run streams 8 decisions incl. approved, resized and blocked.
  Learner check: Open the app, press ▶ Run agent, expand a card and follow a citation.
  Commit: `Build TraceTrade core loop with mock AI`

- [x] **2. Self-check rules and citation verification are proven by tests**
  Becomes usable: `npm test` proves block/resize/approve, SELL-without-holding, source independence, stale data, and dropped citations.
  Why now: This is the learning uncertainty (citation verification) and the product's trust kernel.
  PRD ref: `prd.md > States and Boundaries`
  Spec ref: `spec.md > Self-check`, `spec.md > Uncertainty`
  Build: Vitest suite in `lib/selfCheck.test.ts`.
  Verify (mechanical): `npm test` → 16/16 pass.
  Learner check: Read the test names; each is a rule you can see on a decision card.
  Commit: `Add Vitest tests for selfCheck and citation verification`

- [x] **3. Live AI (Gemini free tier, Groq fallback)**
  Becomes usable: Real model reasoning instead of MOCK AI.
  Why now: Needs Kunal's own free key in env vars (never in chat).
  PRD ref: `prd.md > The Core Journey` (step 2)
  Spec ref: `spec.md > LLM`
  Build: Already implemented in `lib/agent.ts`; only needs `GEMINI_API_KEY` (or `GROQ_API_KEY`) in `.env.local` / Vercel.
  Verify (mechanical): Top bar shows `LIVE · gemini`; a run returns cited decisions; no `AI error` notes.
  Learner check: Run with your key and judge whether the reasoning reads sensibly.
  Commit: (config only, possibly model-name fix)

## Hands-on Checkpoints

- [ ] Kunal runs the app locally in mock mode and gives feedback.
- [ ] Kunal adds a free Gemini key and does a live run before ship.

## Revisions
- 2026-10-23: Slices 1–2 built in one pass (fast mode, delegated).
- 2026-10-23: Slice 3 verified live; default model gemini-3.5-flash with free-tier fallbacks (3.8-flash returned 429 on the free key).
