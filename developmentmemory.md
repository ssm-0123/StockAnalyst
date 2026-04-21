# Development Memory

## Project
- Workspace: `/Users/ssm/Documents/Investment Analyst`
- Stack: Next.js 15 App Router, Webpack dev mode
- Main purpose: investment insight dashboard with saved daily snapshots, history, trend views, and weekly results review

## Current Product Structure
- Home page: `app/page.tsx`
- Results page: `app/Results/page.tsx`
- Lowercase alias route: `app/results/page.tsx` imports and renders `../Results/page`
- Quote API: `app/api/quotes/route.ts`
- Shared types: `lib/types.ts`
- Dashboard/history loaders: `lib/dashboard.ts`
- Main stock row UI: `components/stock-row.tsx`

## Implemented Features
- Added small-cap / undervalued idea section via `components/small-cap-panel.tsx`
- Added `/Results` weekly review dashboard backed by `public/data/results/latest.json`
- Added `public/data/results/history/.gitkeep`
- Added results automation prompts:
  - `RESULTS_AUTOMATION_PROMPT.txt`
  - `RESULTS_AUTOMATION_PROMPT.md`
  - `RESULTS_AUTOMATION_RUN_PROMPT.txt`
- Home page link now points to lowercase `/results`

## History And Trend Rules
- Same calendar day can have multiple analysis runs
- History files use datetime naming such as `YYYY-MM-DDTHH-mm-ss.json`
- `lib/dashboard.ts` groups same-date snapshots and uses the latest `lastUpdated` entry as that day's representative value
- 7-day trend should therefore mean latest snapshot per day, not every run

## Stock / Quote Data Model
- `StockIdea` now supports:
  - `quoteSymbol?: string`
  - `priceSnapshot?: StockPriceSnapshot`
- `SmallCapIdea` now also supports:
  - `quoteSymbol?: string`
  - `priceSnapshot?: StockPriceSnapshot`
- `StockPriceSnapshot` includes:
  - `currentPrice`
  - `currency`
  - `previousCloseChangePct`
  - `week52High`
  - `week52Low`
  - `asOf`
  - `sourceNote?`
- Currency enum currently: `KRW | USD`

## UI Behavior For Price Info
- Stock rows are expandable in `components/stock-row.tsx`
- Expanded view shows:
  - analysis-time snapshot from saved `priceSnapshot`
  - optional live quote fetched from `/api/quotes`
- `components/small-cap-panel.tsx` now also shows an analysis-time price snapshot block for `smallCapIdeas`
- Product decision: analysis snapshot is canonical/default, live API quote is supplementary only
- This avoids mixing recommendation logic with a later market price

## Quote API Design
- `app/api/quotes/route.ts` uses Yahoo-based fallback chain
- Current intended order:
  - Yahoo page parse first
  - fallback to Yahoo `v7/finance/quote`
  - fallback to Yahoo `v8/chart`
- Reason: some endpoints returned bad values for Korean stocks
- Added sanity filters to reject obvious bad data:
  - reject `previousCloseChangePct` when absolute value is greater than 50
  - reject prices obviously inconsistent with 52-week range
- Diagnosis already made: weird outputs like `+287.88%` were treated as source anomalies, not a UI formatting bug

## Prompting Rules For Daily Automation
- Main prompt files:
  - `AUTOMATION_PROMPT.txt`
  - `AUTOMATION_PROMPT.md`
  - `AUTOMATION_RUN_PROMPT.txt`
- Prompt was updated so each stock should save price info before writing insight text
- Prompt was also updated so each `smallCapIdeas` item should save the same price info before writing `whyNow` and related text
- Required intent:
  - check current price, previous-day change, 52-week high, and 52-week low first
  - store them in `priceSnapshot`
  - then write the recommendation / thesis
- Preferred price source was standardized to Yahoo Finance quote/detail pages
- Latest rule:
  - `smallCapIdeas` should usually include 4-6 names when enough valid candidates exist, with 6 as the practical upper bound
  - all `priceSnapshot` values must come from the latest available Yahoo Finance page data
  - if a price field cannot be verified on Yahoo Finance, leave it blank rather than guessing or backfilling from another stale source
- If price cannot be found, leave reason in `sourceNote`

## Prompting Rules For Weekly Results Automation
- Saturday automation should use `RESULTS_AUTOMATION_RUN_PROMPT.txt`
- That file tells the automation to read `RESULTS_AUTOMATION_PROMPT.txt` and update `public/data/results/latest.json`

## Earlier Stability Fixes
- Duplicate React key warnings were fixed by replacing fragile keys with safer composite keys in list-rendering components
- Next devtools-related runtime issue `__webpack_modules__[moduleId] is not a function` had previously been mitigated by disabling:
  - `experimental.devtoolSegmentExplorer = false` in `next.config.ts`

## Current Known Issue
- Dev build cache has been unstable
- Observed errors included:
  - `Cannot find module './331.js'`
  - missing `.next/routes-manifest.json`
  - route-level `500`
- `npm run build` had succeeded even while `npm run dev` was failing
- Root cause is treated as corrupted `.next` dev cache rather than route code
- If dev server breaks again, first recovery step is to clear `.next` and restart dev server

## Results Route Note
- Do not try to maintain both `app/Results` and `app/results` on this macOS workspace
- Filesystem is case-insensitive here, so that caused a self-import recursion and a prerender stack overflow
- Keep only `app/Results/page.tsx` as the real page and link to `/Results`

## Working Decisions To Preserve
- Use saved snapshot data for explanation and default display
- Use live quote only as a comparison aid
- Keep history for multiple runs on the same day
- Use the latest snapshot of each day for trend aggregation
- Keep results evaluation as a separate weekly flow under `/results`

## Immediate Follow-Up
- Restart dev server cleanly
- If runtime errors continue, wipe `.next` and start `npm run dev` again
