# TraceTrade — an AI paper trader that shows its receipts

An AI agent paper-trades **$10,000 of fake money** across 8 assets (BTC, ETH, SOL, AAPL, NVDA, TSLA, MSFT, SPY).
Every run it reads live prices, recent headlines and Polymarket odds, proposes BUY/SELL/HOLD **with numbered citations**,
then a deterministic **self-check** approves, resizes or blocks each trade before it executes. No real money, no brokerage.

## How it works
1. **Signals** (free, no keys): CoinGecko (crypto), Yahoo Finance chart (stocks), Google News RSS, Polymarket gamma API.
2. **Reasoning**: Gemini free tier via its OpenAI-compatible API, falling back per asset across free Gemini models and then Groq (gpt-oss). Output is validated with zod.
   **Citation verification**: any source ID the model cites that wasn't actually fetched is dropped and shown.
3. **Self-check** (`lib/selfCheck.ts`): blocks stale data, fewer than 2 independent outlets, or SELL without a holding;
   resizes to max 20% per position / available cash; blocks trades under $100; flags stock trades when the US market is closed.
4. **Paper execution** at the fetched price; the portfolio and the full decision log live in your browser (localStorage).

## Run it
```bash
npm install
cp .env.example .env.local   # add a free GEMINI_API_KEY (or GROQ_API_KEY) — optional
npm run dev                  # http://localhost:3000
```
With no key the app runs in **MOCK AI** mode (a labelled, rule-based stand-in using the real signals), so the whole flow is demoable.

```bash
npm test         # Vitest: self-check rules + citation verification
npm run build
```

## Stack
Next.js 16, React 19, Tailwind 4, TypeScript, openai SDK (OpenAI-compatible), zod, fast-xml-parser, Vitest.

Not financial advice. Paper trading only.

## License
MIT
