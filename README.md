# Investment Analyst Dashboard

Modern daily stock market sector dashboard built with Next.js App Router, TypeScript, Tailwind CSS, and reusable `shadcn/ui`-style components.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Publish on GitHub Pages

This project can be deployed as a static site on GitHub Pages.

- The dashboard pages are exported as static HTML.
- The live quote button is disabled on GitHub Pages because route handlers do not run there.
- Pushes to `main` trigger `.github/workflows/deploy-pages.yml`.

### First-time setup

1. Create a GitHub repository and push this folder.
2. In GitHub, open `Settings -> Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main`.

Your site URL will usually be:

- `https://<github-username>.github.io/<repo-name>/`
- If the repo name is exactly `<github-username>.github.io`, then the URL is `https://<github-username>.github.io/`

## Data source

The UI reads:

- `public/data/latest.json`
- `public/data/history/*.json`
- `public/data/results/latest.json`
- `public/data/results/history/*.json`

Primary rendering is driven by `latest.json`. The repository keeps only a neutral schema sample there, and the automation should overwrite it with real daily output.

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
- Responsive desktop-first layout with mobile support
- GitHub Pages build disables live quote API calls automatically
