import fs from "node:fs/promises";
import path from "node:path";

import { normalizeDailyAnalysis, normalizeWeeklyResultsReport } from "@/lib/data-normalizers";
import { enrichDailyAnalysis, enrichWeeklyResultsReport } from "@/lib/quality";
import {
  AnalysisSuggestion,
  DailyAnalysis,
  LegacySectorDecision,
  SmallCapTrackingMeta,
  TrendSummary,
  WeeklyResultsReport,
} from "@/lib/types";

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

type LegacySectorAggregate = {
  sectorName: string;
  market: LegacySectorDecision["market"];
  previousBestRank: number;
  lastSeenDate: string;
  appearances14d: number;
};

export function buildLegacySectorDecisions(
  current: DailyAnalysis,
  history: DailyAnalysis[],
  reports: WeeklyResultsReport[],
) {
  const currentPromising = new Set(current.promisingSectors.map((sector) => `${sector.market}:${sector.sectorName}`));
  const currentCaution = new Set(current.cautionSectors.map((sector) => `${sector.market}:${sector.sectorName}`));
  const recentHistory = selectLatestEntriesPerDate(history).slice(0, 14);
  const sectorMap = new Map<string, LegacySectorAggregate>();
  const recentReports = recentResultsWindow(reports);

  for (const entry of recentHistory) {
    for (const sector of entry.promisingSectors) {
      const key = `${sector.market}:${sector.sectorName}`;

      if (currentPromising.has(key)) {
        continue;
      }

      const currentValue = sectorMap.get(key) ?? {
        sectorName: sector.sectorName,
        market: sector.market,
        previousBestRank: sector.rank,
        lastSeenDate: entry.date,
        appearances14d: 0,
      };

      currentValue.previousBestRank = Math.min(currentValue.previousBestRank, sector.rank);
      currentValue.lastSeenDate =
        currentValue.lastSeenDate.localeCompare(entry.date) < 0 ? entry.date : currentValue.lastSeenDate;
      currentValue.appearances14d += 1;
      sectorMap.set(key, currentValue);
    }
  }

  const resultsBySector = new Map<
    string,
    {
      totalAlpha: number;
      failedCount: number;
      mixedCount: number;
      totalReviews: number;
      lastDetail: string;
    }
  >();

  for (const report of recentReports) {
    for (const review of report.sectorReviews) {
      const key = `${review.market}:${review.sectorName}`;
      const currentValue = resultsBySector.get(key) ?? {
        totalAlpha: 0,
        failedCount: 0,
        mixedCount: 0,
        totalReviews: 0,
        lastDetail: review.detail,
      };

      currentValue.totalReviews += 1;
      currentValue.totalAlpha += review.callAlphaPct;
      currentValue.lastDetail = review.detail;

      if (review.verdict === "failed") {
        currentValue.failedCount += 1;
      } else if (review.verdict === "mixed") {
        currentValue.mixedCount += 1;
      }

      resultsBySector.set(key, currentValue);
    }
  }

  return Array.from(sectorMap.entries())
    .map<LegacySectorDecision | null>(([key, aggregate]) => {
      if (aggregate.appearances14d < 2 && aggregate.previousBestRank > 1) {
        return null;
      }

      const result = resultsBySector.get(key);
      const avgAlpha = result?.totalReviews ? result.totalAlpha / result.totalReviews : 0;
      const daysSinceLastSeen = Math.max(
        0,
        Math.floor((getTimestampValue(current.date) - getTimestampValue(aggregate.lastSeenDate)) / 86_400_000),
      );
      const nowCaution = currentCaution.has(key);

      let decision: LegacySectorDecision["decision"];

      if (nowCaution || (result?.failedCount ?? 0) >= 1 || avgAlpha <= -4 || daysSinceLastSeen >= 5) {
        decision = "exit";
      } else if ((result?.mixedCount ?? 0) >= 1 || avgAlpha < 0 || daysSinceLastSeen >= 3) {
        decision = "reduce";
      } else if (aggregate.previousBestRank === 1 && daysSinceLastSeen <= 2 && avgAlpha >= 0) {
        decision = "hold";
      } else {
        decision = "reenter-watch";
      }

      const rationale =
        decision === "hold"
          ? `${aggregate.sectorName}는 최근 Top 3에서 빠졌지만 이탈 기간이 짧고, 과거 상위 랭크와 최근 성과가 완전히 훼손되지는 않았습니다.`
          : decision === "reduce"
            ? `${aggregate.sectorName}는 과거 상위권이었지만 최근 순위 이탈이 이어지거나 성과가 둔화돼 비중 축소가 우선입니다.`
            : decision === "exit"
              ? `${aggregate.sectorName}는 과거 상위권 대비 최근 성과와 현재 우선순위가 함께 약해져 정리 판단이 더 적절합니다.`
              : `${aggregate.sectorName}는 즉시 비중 확대보다 재진입 조건이 다시 생기는지 관찰하는 편이 낫습니다.`;

      const triggerNote =
        decision === "hold"
          ? "다음 1~3회 분석에서 다시 Top 3에 복귀하거나 관련 종목 상대강도가 유지되는지 확인합니다."
          : decision === "reduce"
            ? "다음 촉매가 확인되기 전까지 비중을 줄이고 Results와 순위 복귀 여부를 다시 봅니다."
            : decision === "exit"
              ? "현재는 자금 순환이 다른 섹터로 넘어간 것으로 보고 정리 후 대체 섹터를 우선 검토합니다."
              : "촉매 재점화나 순위 복귀가 확인되기 전까지는 감시 목록 수준으로만 둡니다.";

      const resultsSummary = result?.totalReviews
        ? `최근 2주 Results 평균 알파 ${avgAlpha.toFixed(1)}%, 실패 ${result.failedCount}회, mixed ${result.mixedCount}회. ${result.lastDetail}`
        : undefined;

      return {
        sectorName: aggregate.sectorName,
        market: aggregate.market,
        previousBestRank: aggregate.previousBestRank,
        lastSeenDate: aggregate.lastSeenDate,
        appearances14d: aggregate.appearances14d,
        decision,
        rationale,
        triggerNote,
        resultsSummary,
      };
    })
    .filter((item): item is LegacySectorDecision => Boolean(item))
    .sort((a, b) => {
      const decisionWeight = (value: LegacySectorDecision["decision"]) => {
        if (value === "exit") return 4;
        if (value === "reduce") return 3;
        if (value === "hold") return 2;
        return 1;
      };

      const decisionDiff = decisionWeight(b.decision) - decisionWeight(a.decision);
      if (decisionDiff !== 0) {
        return decisionDiff;
      }

      if (a.previousBestRank !== b.previousBestRank) {
        return a.previousBestRank - b.previousBestRank;
      }

      return b.appearances14d - a.appearances14d;
    })
    .slice(0, 4);
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
