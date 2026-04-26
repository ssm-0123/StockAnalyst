# Investment Analyst Dashboard

Modern daily stock market sector dashboard built with Next.js App Router, TypeScript, Tailwind CSS, and reusable `shadcn/ui`-style components.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If the Next.js dev cache gets unstable, use:

```bash
npm run dev:clean
```

Run the logic test suite with:

```bash
npm test
```

Check the saved dashboard/result data quality with:

```bash
npm run check:data
```

Use `npm run check:data:strict` when you want CI-style failure thresholds for invalid or low-freshness data.

Check whether the deploy mirror has uncommitted changes with:

```bash
npm run check:mirror
```

Push the deploy mirror manually, with DNS/network retries:

```bash
npm run push:pages
```

Install the macOS background push helper that runs the same command every 10 minutes outside the Codex sandbox:

```bash
npm run install:push-agent
```

Check whether recent history has enough repeated snapshots for the Results page with:

```bash
npm run check:history
```

## Data source

The UI reads:

- `public/data/latest.json`
- `public/data/history/*.json`
- `public/data/results/latest.json`
- `public/data/results/history/*.json`

Primary rendering is driven by `latest.json`. The repository keeps only a neutral schema sample there, and the automation should overwrite it with real daily output.

## Source Of Truth

- The root workspace is the single source of truth.
- `github-pages-root/` is a deploy mirror, not a second app to edit manually.
- When app code, prompts, or docs change, sync the deploy mirror with:

```bash
npm run sync:pages
```

## Expected usage

- Update `latest.json` for today’s full dashboard state
- Write `history/*.json` snapshots when replacing a real `latest.json`, including multiple same-day runs with different timestamps
- Optionally include `smallCapIdeas` in `latest.json` if you want the dashboard to surface underfollowed small/mid-cap ideas
- Optionally include `trendSummary` in `latest.json` if you want the automation to fully control the 7-day trend section too

If `trendSummary` is omitted, the app falls back to a very small aggregation from `history/*.json`, using only the latest snapshot from each date.

## Sample Data Policy

- `public/data/latest.json` is a schema sample, not a trusted market view
- `public/data/history/` is intentionally empty by default
- Automation should treat repo JSON as templates unless it wrote the files itself

## Automation Prompt Files

- `AUTOMATION_PROMPT.txt`: full automation instruction set
- `AUTOMATION_RUN_PROMPT.txt`: short launcher prompt that tells the automation to read the full prompt file
- `RESULTS_AUTOMATION_PROMPT.txt`: weekly results-evaluation prompt
- `RESULTS_AUTOMATION_RUN_PROMPT.txt`: short launcher prompt for the `/Results` report

## Components

- `SummaryCard`
- `SectorCard`
- `StockRow`
- `ChangeList`
- `ReasonPanel`
- `TrendPanel`
- `CheckpointList`
- `SmallCapPanel`
- `/Results` weekly review page

## Notes

- No backend
- No auth
- JSON-driven daily decision support UI
- The UI shows saved `priceSnapshot` data only; there is no live quote fetch path
- Responsive desktop-first layout with mobile support
