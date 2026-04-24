import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { normalizeDailyAnalysis } from "../lib/data-normalizers";
import { selectLatestEntriesPerDate } from "../lib/dashboard";
import { enrichDailyAnalysis } from "../lib/quality";
import { DailyAnalysis, MarketCode, StockPriceSnapshot } from "../lib/types";

type CliOptions = {
  strict: boolean;
  json: boolean;
  days: number;
};

type Observation = {
  date: string;
  market: MarketCode;
  ticker: string;
  companyName: string;
  sector: string;
  stance: "promising" | "caution" | "small-cap";
  hasPrice: boolean;
  price?: number;
  snapshotHealth?: string;
};

type TickerCoverage = {
  ticker: string;
  companyName: string;
  market: MarketCode;
  sector: string;
  stances: string[];
  appearances: number;
  pricedObservations: number;
  firstDate: string;
  lastDate: string;
  evaluable: boolean;
};

const rootDir = process.cwd();

function parseOptions(argv: string[]): CliOptions {
  const daysFlag = argv.find((arg) => arg.startsWith("--days="));
  const days = daysFlag ? Number(daysFlag.split("=")[1]) : 7;

  return {
    strict: argv.includes("--strict"),
    json: argv.includes("--json"),
    days: Number.isFinite(days) && days > 0 ? Math.floor(days) : 7,
  };
}

async function readJsonFile(filePath: string) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as unknown;
}

async function readHistoryEntries() {
  const historyDir = path.join(rootDir, "public", "data", "history");

  try {
    const files = await fs.readdir(historyDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    return Promise.all(
      jsonFiles.map(async (file) =>
        enrichDailyAnalysis(normalizeDailyAnalysis(await readJsonFile(path.join(historyDir, file)))),
      ),
    );
  } catch {
    return [];
  }
}

async function readDailyEntries() {
  const latestPath = path.join(rootDir, "public", "data", "latest.json");
  const latest = enrichDailyAnalysis(normalizeDailyAnalysis(await readJsonFile(latestPath)));
  const history = await readHistoryEntries();

  return selectLatestEntriesPerDate([latest, ...history]);
}

function hasUsablePrice(snapshot?: StockPriceSnapshot) {
  return typeof snapshot?.currentPrice === "number" && Number.isFinite(snapshot.currentPrice);
}

function observationsFromEntry(entry: DailyAnalysis): Observation[] {
  const observations: Observation[] = [];

  for (const sector of entry.promisingSectors) {
    for (const stock of sector.stocks) {
      observations.push({
        date: entry.date,
        market: stock.market,
        ticker: stock.ticker,
        companyName: stock.companyName,
        sector: sector.sectorName,
        stance: "promising",
        hasPrice: hasUsablePrice(stock.priceSnapshot),
        price: stock.priceSnapshot?.currentPrice,
        snapshotHealth: stock.snapshotHealth,
      });
    }
  }

  for (const sector of entry.cautionSectors) {
    for (const stock of sector.stocks) {
      observations.push({
        date: entry.date,
        market: stock.market,
        ticker: stock.ticker,
        companyName: stock.companyName,
        sector: sector.sectorName,
        stance: "caution",
        hasPrice: hasUsablePrice(stock.priceSnapshot),
        price: stock.priceSnapshot?.currentPrice,
        snapshotHealth: stock.snapshotHealth,
      });
    }
  }

  for (const idea of entry.smallCapIdeas ?? []) {
    observations.push({
      date: entry.date,
      market: idea.market,
      ticker: idea.ticker,
      companyName: idea.companyName,
      sector: idea.sector,
      stance: "small-cap",
      hasPrice: hasUsablePrice(idea.priceSnapshot),
      price: idea.priceSnapshot?.currentPrice,
      snapshotHealth: idea.snapshotHealth,
    });
  }

  return observations;
}

function summarizeTickerCoverage(observations: Observation[]): TickerCoverage[] {
  const byTicker = new Map<string, Observation[]>();

  for (const observation of observations) {
    const key = `${observation.market}:${observation.ticker}`;
    byTicker.set(key, [...(byTicker.get(key) ?? []), observation]);
  }

  return Array.from(byTicker.values())
    .map((items) => {
      const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      const stances = Array.from(new Set(sorted.map((item) => item.stance)));
      const pricedObservations = sorted.filter((item) => item.hasPrice).length;

      return {
        ticker: latest.ticker,
        companyName: latest.companyName,
        market: latest.market,
        sector: latest.sector,
        stances,
        appearances: sorted.length,
        pricedObservations,
        firstDate: sorted[0].date,
        lastDate: latest.date,
        evaluable: pricedObservations >= 2,
      };
    })
    .sort((a, b) => b.appearances - a.appearances || b.pricedObservations - a.pricedObservations);
}

function pct(numerator: number, denominator: number) {
  if (denominator === 0) {
    return "0%";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function shouldFail(summary: ReturnType<typeof buildCoverageReport>, strict: boolean) {
  if (!strict) {
    return false;
  }

  return summary.representativeDays < 3 || summary.evaluableTickers < 4 || summary.smallCapEvaluableTickers < 1;
}

function buildCoverageReport(entries: DailyAnalysis[], days: number) {
  const window = entries.slice(0, days);
  const observations = window.flatMap(observationsFromEntry);
  const tickers = summarizeTickerCoverage(observations);
  const repeated = tickers.filter((item) => item.appearances >= 2);
  const evaluable = tickers.filter((item) => item.evaluable);
  const smallCapTickers = tickers.filter((item) => item.stances.includes("small-cap"));
  const smallCapRepeated = smallCapTickers.filter((item) => item.appearances >= 2);
  const smallCapEvaluable = smallCapTickers.filter((item) => item.evaluable);
  const pricedObservations = observations.filter((item) => item.hasPrice).length;

  return {
    daysRequested: days,
    representativeDays: window.length,
    startDate: window[window.length - 1]?.date ?? "N/A",
    endDate: window[0]?.date ?? "N/A",
    observations: observations.length,
    pricedObservations,
    pricedObservationRatio: pct(pricedObservations, observations.length),
    uniqueTickers: tickers.length,
    repeatedTickers: repeated.length,
    evaluableTickers: evaluable.length,
    smallCapTickers: smallCapTickers.length,
    smallCapRepeatedTickers: smallCapRepeated.length,
    smallCapEvaluableTickers: smallCapEvaluable.length,
    topRepeated: repeated.slice(0, 12),
    topEvaluable: evaluable.slice(0, 12),
  };
}

function printCoverage(report: ReturnType<typeof buildCoverageReport>, strict: boolean) {
  console.log(
    `[History coverage] 대표일 ${report.representativeDays}/${report.daysRequested}일 ` +
      `${report.startDate} - ${report.endDate}`,
  );
  console.log(
    `  관측 ${report.observations}건, 가격 관측 ${report.pricedObservations}건(${report.pricedObservationRatio}), ` +
      `고유 종목 ${report.uniqueTickers}개`,
  );
  console.log(
    `  반복 종목 ${report.repeatedTickers}개, 평가 가능 종목 ${report.evaluableTickers}개, ` +
      `중소형 평가 가능 ${report.smallCapEvaluableTickers}개`,
  );

  if (report.topRepeated.length) {
    console.log("  반복 관측 상위:");
    for (const item of report.topRepeated.slice(0, 8)) {
      console.log(
        `  - ${item.market} ${item.ticker} ${item.companyName}: ` +
          `${item.appearances}회 관측, 가격 ${item.pricedObservations}회, ${item.stances.join("/")}`,
      );
    }
  }

  if (strict) {
    console.log("[strict] 대표일 3일 이상, 평가 가능 종목 4개 이상, 중소형 평가 가능 1개 이상이어야 합니다.");
  }
}

export async function runHistoryCoverageCheck(options: CliOptions) {
  const entries = await readDailyEntries();
  const report = buildCoverageReport(entries, options.days);
  const failed = shouldFail(report, options.strict);

  if (options.json) {
    console.log(JSON.stringify({ failed, strict: options.strict, report }, null, 2));
  } else {
    printCoverage(report, options.strict);
  }

  return failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runHistoryCoverageCheck(parseOptions(process.argv.slice(2)))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
