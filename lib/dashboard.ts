import fs from "node:fs/promises";
import path from "node:path";

import { normalizeDailyAnalysis, normalizeWeeklyResultsReport } from "@/lib/data-normalizers";
import { DailyAnalysis, SmallCapTrackingMeta, TrendSummary, WeeklyResultsReport } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const HISTORY_DIR = path.join(DATA_DIR, "history");
const RESULTS_DIR = path.join(DATA_DIR, "results");
const RESULTS_HISTORY_DIR = path.join(RESULTS_DIR, "history");

async function readJsonFile<T>(filePath: string, normalize: (value: unknown) => T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return normalize(JSON.parse(raw) as unknown);
  } catch {
    return normalize(null);
  }
}

function getTimestampValue(timestamp?: string) {
  if (!timestamp) {
    return Number.NEGATIVE_INFINITY;
  }

  const value = new Date(timestamp).getTime();
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

function sortByLastUpdatedDesc<T extends { lastUpdated?: string }>(a: T, b: T) {
  return getTimestampValue(b.lastUpdated) - getTimestampValue(a.lastUpdated);
}

function getLatestEntryPerDate(entries: DailyAnalysis[]) {
  const latestByDate = new Map<string, DailyAnalysis>();

  for (const entry of entries) {
    const current = latestByDate.get(entry.date);

    if (!current || getTimestampValue(entry.lastUpdated) > getTimestampValue(current.lastUpdated)) {
      latestByDate.set(entry.date, entry);
    }
  }

  return Array.from(latestByDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getLatestAnalysis() {
  const latest = await readJsonFile(path.join(DATA_DIR, "latest.json"), normalizeDailyAnalysis);
  const history = await getHistoryAnalyses();
  const dailyEntries = getLatestEntryPerDate([latest, ...history]);
  const previousDay = dailyEntries.find((entry) => entry.date !== latest.date) ?? null;
  const smallCapTracking = computeSmallCapTracking(dailyEntries.slice(0, 7));

  return {
    latest,
    history,
    previousDay,
    smallCapTracking,
    trendSummary: latest.trendSummary ?? computeTrendSummary(dailyEntries.slice(0, 7)),
  };
}

export async function getHistoryAnalyses() {
  try {
    const files = await fs.readdir(HISTORY_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json")).sort().reverse();
    const results = await Promise.all(
      jsonFiles.map((file) => readJsonFile(path.join(HISTORY_DIR, file), normalizeDailyAnalysis)),
    );

    return results.sort(sortByLastUpdatedDesc);
  } catch {
    return [];
  }
}

export async function getLatestResultsReport() {
  const latest = await readJsonFile(path.join(RESULTS_DIR, "latest.json"), normalizeWeeklyResultsReport);
  const history = await getResultsHistory();

  return {
    latest,
    history,
  };
}

export async function getResultsHistory() {
  try {
    const files = await fs.readdir(RESULTS_HISTORY_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json")).sort().reverse();
    const results = await Promise.all(
      jsonFiles.map((file) => readJsonFile(path.join(RESULTS_HISTORY_DIR, file), normalizeWeeklyResultsReport)),
    );

    return results.sort(sortByLastUpdatedDesc);
  } catch {
    return [];
  }
}

function directionFromCounts(current: number, previous: number) {
  if (current > previous) {
    return "up" as const;
  }

  if (current < previous) {
    return "down" as const;
  }

  return "flat" as const;
}

function countOccurrences(items: string[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

export function computeTrendSummary(window: DailyAnalysis[]): TrendSummary {
  const previousWindow = window.slice(1);

  const promisingSectorCounts = countOccurrences(
    window.flatMap((entry) => entry.promisingSectors.map((sector) => sector.sectorName)),
  );
  const cautionSectorCounts = countOccurrences(
    window.flatMap((entry) => entry.cautionSectors.map((sector) => sector.sectorName)),
  );
  const stockCounts = countOccurrences(
    window.flatMap((entry) => [
      ...entry.promisingSectors.flatMap((sector) => sector.stocks.map((stock) => stock.ticker)),
      ...entry.cautionSectors.flatMap((sector) => sector.stocks.map((stock) => stock.ticker)),
    ]),
  );

  const previousPromisingCounts = countOccurrences(
    previousWindow.flatMap((entry) => entry.promisingSectors.map((sector) => sector.sectorName)),
  );
  const previousCautionCounts = countOccurrences(
    previousWindow.flatMap((entry) => entry.cautionSectors.map((sector) => sector.sectorName)),
  );
  const previousStockCounts = countOccurrences(
    previousWindow.flatMap((entry) => [
      ...entry.promisingSectors.flatMap((sector) => sector.stocks.map((stock) => stock.ticker)),
      ...entry.cautionSectors.flatMap((sector) => sector.stocks.map((stock) => stock.ticker)),
    ]),
  );

  const promisingSectorSeries = Object.entries(promisingSectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector, count]) => ({ sector, count }));

  const cautionSectorSeries = Object.entries(cautionSectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector, count]) => ({ sector, count }));

  const [topPromisingSector = ["N/A", 0]] = Object.entries(promisingSectorCounts).sort(
    (a, b) => b[1] - a[1],
  );
  const [topCautionSector = ["N/A", 0]] = Object.entries(cautionSectorCounts).sort(
    (a, b) => b[1] - a[1],
  );

  const repeatedStockIdeas = Object.entries(stockCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ticker, appearances]) => ({
      ticker,
      appearances,
      direction: directionFromCounts(appearances, previousStockCounts[ticker] ?? appearances),
    }));

  return {
    mostFrequentPromisingSector: {
      sector: topPromisingSector[0],
      appearances: topPromisingSector[1],
      trendDirection: directionFromCounts(
        topPromisingSector[1],
        previousPromisingCounts[topPromisingSector[0]] ?? topPromisingSector[1],
      ),
    },
    mostFrequentCautionSector: {
      sector: topCautionSector[0],
      appearances: topCautionSector[1],
      trendDirection: directionFromCounts(
        topCautionSector[1],
        previousCautionCounts[topCautionSector[0]] ?? topCautionSector[1],
      ),
    },
    repeatedStockIdeas,
    promisingSectorSeries,
    cautionSectorSeries,
  };
}

export function computeSmallCapTracking(window: DailyAnalysis[]) {
  const appearances = new Map<string, number>();
  const consecutive = new Map<string, number>();

  for (const [index, entry] of window.entries()) {
    const tickers = new Set(entry.smallCapIdeas?.map((idea) => idea.ticker) ?? []);

    for (const ticker of tickers) {
      appearances.set(ticker, (appearances.get(ticker) ?? 0) + 1);
    }

    if (index === 0) {
      for (const ticker of tickers) {
        consecutive.set(ticker, 1);
      }
      continue;
    }

    for (const [ticker, count] of consecutive.entries()) {
      if (count === index && tickers.has(ticker)) {
        consecutive.set(ticker, count + 1);
      }
    }
  }

  const tracking = new Map<string, SmallCapTrackingMeta>();

  for (const [ticker, appearances7d] of appearances.entries()) {
    tracking.set(ticker, {
      ticker,
      appearances7d,
      consecutiveDays: consecutive.get(ticker) ?? 0,
    });
  }

  return tracking;
}

export function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
