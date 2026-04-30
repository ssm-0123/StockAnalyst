import fs from "node:fs/promises";
import path from "node:path";

import { normalizeDailyAnalysis, normalizeWeeklyResultsReport } from "@/lib/data-normalizers";
import { enrichDailyAnalysis, enrichWeeklyResultsReport } from "@/lib/quality";
import { AnalysisSuggestion, DailyAnalysis, SmallCapTrackingMeta, TrendSummary, WeeklyResultsReport } from "@/lib/types";

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

export function selectLatestEntriesPerDate(entries: DailyAnalysis[]) {
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
  const latest = enrichDailyAnalysis(await readJsonFile(path.join(DATA_DIR, "latest.json"), normalizeDailyAnalysis));
  const history = await getHistoryAnalyses();
  const dailyEntries = selectLatestEntriesPerDate([latest, ...history]);
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
      jsonFiles.map(async (file) =>
        enrichDailyAnalysis(await readJsonFile(path.join(HISTORY_DIR, file), normalizeDailyAnalysis)),
      ),
    );

    return results.sort(sortByLastUpdatedDesc);
  } catch {
    return [];
  }
}

export async function getLatestResultsReport() {
  const latest = enrichWeeklyResultsReport(
    await readJsonFile(path.join(RESULTS_DIR, "latest.json"), normalizeWeeklyResultsReport),
  );
  const history = await getResultsHistory();

  return {
    latest,
    history,
  };
}

function suggestionActionWeight(action: AnalysisSuggestion["action"]) {
  if (action === "trim") return 4;
  if (action === "rotate") return 3;
  if (action === "archive") return 2;
  return 1;
}

function suggestionPriorityWeight(priority?: AnalysisSuggestion["priority"]) {
  return priority === "high" ? 2 : 1;
}

function normalizeSectorToken(value: string) {
  return value.trim().toLowerCase();
}

function matchesAffectedSector(suggestion: AnalysisSuggestion, sectorName: string) {
  const token = normalizeSectorToken(sectorName);
  const title = normalizeSectorToken(suggestion.title);
  const detail = normalizeSectorToken(suggestion.detail);

  if (title.includes(token) || detail.includes(token)) {
    return true;
  }

  return (suggestion.affectedSectors ?? []).some((sector) => normalizeSectorToken(sector) === token);
}

function recentResultsWindow(reports: WeeklyResultsReport[]) {
  if (!reports.length) {
    return [];
  }

  const latestTimestamp = getTimestampValue(reports[0].reportDate || reports[0].lastUpdated);

  return reports.filter((report) => {
    const currentTimestamp = getTimestampValue(report.reportDate || report.lastUpdated);
    const diffDays = Math.floor((latestTimestamp - currentTimestamp) / 86_400_000);
    return diffDays <= 14;
  });
}

type SectorReviewAggregate = {
  sectorName: string;
  market: string;
  priorView: "promising" | "caution";
  failedCount: number;
  mixedCount: number;
  totalReviews: number;
  totalAlpha: number;
  lastDetail: string;
};

export function buildResultsAwareSuggestions(
  baseSuggestions: AnalysisSuggestion[] | undefined,
  reports: WeeklyResultsReport[],
) {
  const suggestions: AnalysisSuggestion[] = [...(baseSuggestions ?? [])].map((suggestion) => ({
    ...suggestion,
    source: suggestion.source ?? "automation",
    priority: suggestion.priority ?? "medium",
  }));
  const recentReports = recentResultsWindow(reports);

  if (!recentReports.length) {
    return suggestions;
  }

  const sectorMap = new Map<string, SectorReviewAggregate>();

  for (const report of recentReports) {
    for (const review of report.sectorReviews) {
      const key = `${review.market}:${review.sectorName}`;
      const current = sectorMap.get(key) ?? {
        sectorName: review.sectorName,
        market: review.market,
        priorView: review.priorView,
        failedCount: 0,
        mixedCount: 0,
        totalReviews: 0,
        totalAlpha: 0,
        lastDetail: review.detail,
      };

      current.totalReviews += 1;
      current.totalAlpha += review.callAlphaPct;
      current.lastDetail = review.detail;

      if (review.verdict === "failed") {
        current.failedCount += 1;
      } else if (review.verdict === "mixed" && review.callAlphaPct <= 0) {
        current.mixedCount += 1;
      }

      sectorMap.set(key, current);
    }
  }

  const generatedSuggestions = Array.from(sectorMap.values())
    .map<AnalysisSuggestion | null>((aggregate) => {
      const averageAlpha = aggregate.totalReviews ? aggregate.totalAlpha / aggregate.totalReviews : 0;
      const weaknessScore = aggregate.failedCount * 2 + aggregate.mixedCount;

      if (weaknessScore < 2 || averageAlpha >= 0) {
        return null;
      }

      const action: AnalysisSuggestion["action"] =
        aggregate.priorView === "caution" ? "rotate" : averageAlpha <= -4 ? "trim" : "rotate";

      return {
        title:
          action === "trim"
            ? `${aggregate.sectorName} 비중 정리 검토`
            : `${aggregate.sectorName} 시각 재정렬 검토`,
        action,
        detail:
          action === "trim"
            ? `최근 2주 Results에서 ${aggregate.sectorName} 관련 콜의 성과가 약해 반복 추천 비중을 줄일 시점인지 점검합니다.`
            : `최근 2주 Results에서 ${aggregate.sectorName} 관련 시각이 반복적으로 빗나가 기존 프레임을 교체할지 확인합니다.`,
        rationale: `최근 2주 sector review ${aggregate.totalReviews}회 중 실패 ${aggregate.failedCount}회, 보수적 mixed ${aggregate.mixedCount}회가 있었고 평균 알파는 ${averageAlpha.toFixed(1)}%입니다. ${aggregate.lastDetail}`,
        affectedSectors: [aggregate.sectorName],
        source: "results-review" as const,
        priority: "high" as const,
      };
    })
    .filter((item): item is AnalysisSuggestion => Boolean(item))
    .sort((a, b) => {
      const priorityDiff = suggestionPriorityWeight(b.priority) - suggestionPriorityWeight(a.priority);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return suggestionActionWeight(b.action) - suggestionActionWeight(a.action);
    })
    .slice(0, 2);

  for (const generated of generatedSuggestions) {
    const matchIndex = suggestions.findIndex((suggestion) =>
      matchesAffectedSector(suggestion, generated.affectedSectors?.[0] ?? ""),
    );

    if (matchIndex >= 0) {
      const current = suggestions[matchIndex];
      suggestions[matchIndex] = {
        ...current,
        action:
          suggestionActionWeight(generated.action) > suggestionActionWeight(current.action)
            ? generated.action
            : current.action,
        source: "results-review",
        priority: "high",
        rationale: `${current.rationale} 최근 Results 기준으로도 ${generated.rationale}`,
      };
      continue;
    }

    suggestions.unshift(generated);
  }

  return suggestions
    .sort((a, b) => {
      const priorityDiff = suggestionPriorityWeight(b.priority) - suggestionPriorityWeight(a.priority);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return suggestionActionWeight(b.action) - suggestionActionWeight(a.action);
    })
    .slice(0, 6);
}

export async function getResultsHistory() {
  try {
    const files = await fs.readdir(RESULTS_HISTORY_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json")).sort().reverse();
    const results = await Promise.all(
      jsonFiles.map(async (file) =>
        enrichWeeklyResultsReport(
          await readJsonFile(path.join(RESULTS_HISTORY_DIR, file), normalizeWeeklyResultsReport),
        ),
      ),
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
