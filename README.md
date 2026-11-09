# Limo Edge — Educational Chart Analyzer

A black-and-purple, phone-first web app that reads a **chart screenshot**, measures **EMA 50, EMA 200, RSI 14 and ATR 14**, and explains the chart in plain English with a practice **entry / stop-loss / take-profit** plan.

> Educational and paper-trading practice only. Nothing here is financial advice and no real orders are ever placed.

## What it does

1. **Upload a chart screenshot** from your phone (camera or gallery) — or paste one from your desktop.
2. The app reads the pixels in your browser: it finds the price path, ignores grid lines and axes, and reconstructs a price series.
3. You confirm the visible high and low (plus the last price) so pixel positions map to real prices.
4. You get:
   - **EMA 50 / EMA 200** — trend structure and cross direction
   - **RSI 14** — overbought / oversold momentum
   - **ATR 14** — volatility, used to size the stop distance
   - **Entry, stop-loss, take-profit** with a 2:1 reward-to-risk target for practice
   - A plain-English narrative, learning cards and a pre-trade checklist
5. Every account starts with a **5-day free trial**; subscription plans unlock continued use.

## Subscription plans

| Plan | Price | What it covers |
| --- | --- | --- |
| Free trial | $0 for 5 days | Full analyzer, 5 days per account |
| Monthly | $12 / month | Unlimited analyses, cancel anytime |
| Yearly | $96 / year | Two months free versus monthly |

Payments are handled by Stripe Checkout when it is configured. If Stripe keys are absent the plans screen says so explicitly instead of pretending to charge.

## Running locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # vitest suite
npm run build   # production build
```

### Environment

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Enables Stripe Checkout for subscriptions |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | Optional Stripe price IDs; otherwise prices are created inline |
| `SESSION_SECRET` | Optional signing secret for session cookies |
| `DATA_DIR` | Where the JSON store lives (defaults to `data/`) |

## Architecture

```
app/
  page.tsx                 landing page
  login/                   sign in / create account
  dashboard/               upload, extraction preview, analysis report
  plans/                   subscription plans + Stripe checkout
  api/auth/*               register, login, logout
  api/analyze              validates payload, returns indicators + plan (402 when access ends)
  api/billing/*            checkout, webhook, confirm
lib/
  extraction.ts            screenshot pixels -> normalized bars
  indicators.ts            sma, ema, rsi, atr, swing levels
  analysis.ts              indicators + level planner + narrative
  trial.ts                 5-day trial and subscription access rules
  store.ts                 file-backed users, sessions, analyses
  auth.ts / session.ts     cookie sessions
  validation.ts            request parsing and clamping
components/                UI building blocks
tests/                     vitest coverage for the core logic
```

## Notes and limits

- Chart reading is heuristic: crop tightly to the chart area, keep candles or the line visible, and confirm the visible high/low for accurate levels. Read the on-screen warnings.
- Data is stored in a JSON file inside the container, so accounts and history reset when the container is replaced. A production deployment should point `DATA_DIR` at a persistent disk and add a database.
- Screenshots are processed in the browser; only the extracted numbers are sent to the API.
