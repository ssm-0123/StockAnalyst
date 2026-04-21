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
- Home page link points to `/Results`

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
  - `followThroughNote?: string`
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
- small-cap cards now also show:
  - recent tracking badges such as consecutive tracked days and 7-day appearances
  - `followThroughNote` explaining why a name is still worth watching after multiple up days / multiple days of tracking
- Product decision: analysis snapshot is canonical/default, live API quote is supplementary only
- This avoids mixing recommendation logic with a later market price

## Quote API Design
- Main app runtime is split by market
- KR quotes:
  - use Naver Finance domestic stock page display data
  - rationale: Naver is more practical than Yahoo for Korean small/mid caps and reflects KRX-based domestic pricing
- US quotes:
  - use Yahoo page parse first
  - fallback to Yahoo `v7/finance/quote`
  - fallback to Yahoo `v8/chart`
- `github-pages-root` itself is a static deployment target, so live quote fetching may remain disabled there even when the main app supports it
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
- Preferred price source is now market-specific:
  - KR: Naver Finance domestic stock pages
  - US: Yahoo Finance quote/detail pages
- Latest rule:
  - `smallCapIdeas` should target at least 3 names and usually land in the 4-6 range, with 6 as the practical upper bound
  - all `priceSnapshot` values must come from the latest available market-specific source page data
  - `priceDate` must reflect the actual source quote date
  - if the latest source price is older than 5 calendar days versus the analysis date, treat it as stale and do not use the number in price-based reasoning
  - if a price field cannot be verified on the chosen source, leave it blank rather than guessing or backfilling from another stale source
  - small-cap ideas should not churn daily without a clear reason; if the thesis still holds, keep them in the next run so price snapshots accumulate across days
  - each `smallCapIdeas` item should include a `followThroughNote` that explains why the idea can still work after recent gains or repeated daily tracking
- If price cannot be found, leave reason in `sourceNote`

## Prompting Rules For Weekly Results Automation
- Saturday automation should use `RESULTS_AUTOMATION_RUN_PROMPT.txt`
- That file tells the automation to read `RESULTS_AUTOMATION_PROMPT.txt` and update `public/data/results/latest.json`
- Weekly results should use `priceSnapshot.currentPrice` as the primary source for entry/evaluation prices
- Text in `whyNow` or `rationale` is only a fallback when snapshot data is missing
- This is especially important for `smallCapIdeas`, where tracking quality depends on repeated daily snapshots

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
- Keep results evaluation as a separate weekly flow under `/Results`

## Immediate Follow-Up
- Restart dev server cleanly
- If runtime errors continue, wipe `.next` and start `npm run dev` again
