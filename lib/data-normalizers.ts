import {
  ChangeEvent,
  CheckpointItem,
  DailyAnalysis,
  EvaluatedInsight,
  MarketCode,
  ReasonBlock,
  SectorEntry,
  SectorReview,
  SmallCapIdea,
  StockIdea,
  StockPriceSnapshot,
  StockStatus,
  TrendSummary,
  WeeklyResultsReport,
} from "@/lib/types";

type JsonRecord = Record<string, unknown>;

const MARKET_CODES = new Set<MarketCode>(["KR", "US", "GLOBAL"]);
const STOCK_STATUSES = new Set<StockStatus>([
  "new",
  "hold",
  "upgrade",
  "downgrade",
  "removed",
  "up",
  "down",
  "no-change",
]);
const CHANGE_TYPES = new Set<ChangeEvent["type"]>([
  "upgrade",
  "downgrade",
  "new-stock",
  "removed-stock",
  "new-theme",
  "fading-theme",
]);
const CHECKPOINT_CATEGORIES = new Set<CheckpointItem["category"]>(["earnings", "macro", "policy", "risk"]);
const RESULTS_VERDICTS = new Set<EvaluatedInsight["verdict"]>(["worked", "mixed", "failed"]);
const RESULTS_STANCES = new Set<EvaluatedInsight["stance"]>(["promising", "caution", "small-cap"]);
const PRICE_EVIDENCE = new Set<EvaluatedInsight["priceEvidence"]>(["snapshot", "fallback", "mixed"]);
const DATA_QUALITY = new Set<EvaluatedInsight["dataQuality"]>(["verified", "limited", "stale-excluded"]);
const TREND_DIRECTIONS = new Set<TrendSummary["mostFrequentPromisingSector"]["trendDirection"]>(["up", "down", "flat"]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown) {
  return asArray(value).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asMarketCode(value: unknown, fallback: MarketCode = "GLOBAL"): MarketCode {
  return typeof value === "string" && MARKET_CODES.has(value as MarketCode) ? (value as MarketCode) : fallback;
}

function asOptionalMarketCode(value: unknown) {
  return typeof value === "string" && MARKET_CODES.has(value as MarketCode) ? (value as MarketCode) : undefined;
}

function asStockStatus(value: unknown, fallback: StockStatus = "hold"): StockStatus {
  return typeof value === "string" && STOCK_STATUSES.has(value as StockStatus) ? (value as StockStatus) : fallback;
}

function normalizePriceSnapshot(value: unknown): StockPriceSnapshot | undefined {
  const input = asRecord(value);
  const snapshot: StockPriceSnapshot = {
    priceDate: asString(input.priceDate, "업데이트 예정"),
    currentPrice: asOptionalNumber(input.currentPrice),
    previousCloseChangePct: asOptionalNumber(input.previousCloseChangePct),
    week52High: asOptionalNumber(input.week52High),
    week52Low: asOptionalNumber(input.week52Low),
    currency: input.currency === "KRW" || input.currency === "USD" ? input.currency : undefined,
    sourceNote: asOptionalString(input.sourceNote),
  };

  const hasAnyValue =
    snapshot.currentPrice != null ||
    snapshot.previousCloseChangePct != null ||
    snapshot.week52High != null ||
    snapshot.week52Low != null ||
    Boolean(snapshot.sourceNote);

  return hasAnyValue ? snapshot : undefined;
}

function normalizeStockIdea(value: unknown): StockIdea {
  const input = asRecord(value);
  return {
    ticker: asString(input.ticker, "N/A"),
    quoteSymbol: asOptionalString(input.quoteSymbol),
    companyName: asString(input.companyName, "이름 미확인"),
    market: asMarketCode(input.market, "GLOBAL"),
    rationale: asString(input.rationale, "근거가 아직 비어 있습니다."),
    isNew: typeof input.isNew === "boolean" ? input.isNew : undefined,
    change: asStockStatus(input.change),
    priceSnapshot: normalizePriceSnapshot(input.priceSnapshot),
  };
}

function normalizeSectorEntry(value: unknown): SectorEntry {
  const input = asRecord(value);
  return {
    sectorName: asString(input.sectorName, "미분류"),
    market: asMarketCode(input.market, "GLOBAL"),
    rank: asNumber(input.rank, 0),
    confidenceScore: asNumber(input.confidenceScore, 0),
    thesis: asString(input.thesis, "섹터 코멘트가 아직 없습니다."),
    keyDrivers: asStringArray(input.keyDrivers),
    risks: asStringArray(input.risks),
    headwinds: asStringArray(input.headwinds),
    whatCouldImprove: asStringArray(input.whatCouldImprove),
    stocks: asArray(input.stocks).map(normalizeStockIdea),
  };
}

function normalizeChangeEvent(value: unknown): ChangeEvent {
  const input = asRecord(value);
  return {
    type:
      typeof input.type === "string" && CHANGE_TYPES.has(input.type as ChangeEvent["type"])
        ? (input.type as ChangeEvent["type"])
        : "new-theme",
    title: asString(input.title, "변화 항목"),
    detail: asString(input.detail, "상세 설명 없음"),
  };
}

function normalizeReasonBlock(value: unknown, fallbackTitle: string): ReasonBlock {
  const input = asRecord(value);
  return {
    title: asString(input.title, fallbackTitle),
    summary: asStringArray(input.summary),
    affectedSectors: asStringArray(input.affectedSectors),
  };
}

function normalizeCheckpointItem(value: unknown): CheckpointItem {
  const input = asRecord(value);
  return {
    category:
      typeof input.category === "string" && CHECKPOINT_CATEGORIES.has(input.category as CheckpointItem["category"])
        ? (input.category as CheckpointItem["category"])
        : "macro",
    market: asOptionalMarketCode(input.market),
    title: asString(input.title, "체크포인트"),
    date: asString(input.date, "미정"),
    note: asString(input.note, "상세 설명 없음"),
  };
}

function normalizeSmallCapIdea(value: unknown): SmallCapIdea {
  const input = asRecord(value);
  return {
    rank: asNumber(input.rank, 0),
    ticker: asString(input.ticker, "N/A"),
    quoteSymbol: asOptionalString(input.quoteSymbol),
    companyName: asString(input.companyName, "이름 미확인"),
    market: asMarketCode(input.market, "GLOBAL"),
    sector: asString(input.sector, "미분류"),
    theme: asString(input.theme, "테마 미입력"),
    thesis: asString(input.thesis, "투자 논리 없음"),
    whyNow: asString(input.whyNow, "근거 없음"),
    followThroughNote: asOptionalString(input.followThroughNote),
    valuationNote: asString(input.valuationNote, "밸류 포인트 없음"),
    liquidityNote: asString(input.liquidityNote, "유동성 메모 없음"),
    catalysts: asStringArray(input.catalysts),
    risks: asStringArray(input.risks),
    priceSnapshot: normalizePriceSnapshot(input.priceSnapshot),
  };
}

function normalizeTrendSummary(value: unknown): TrendSummary | undefined {
  const input = asRecord(value);
  if (!Object.keys(input).length) {
    return undefined;
  }

  const normalizeDirection = (raw: unknown) =>
    typeof raw === "string" && TREND_DIRECTIONS.has(raw as TrendSummary["mostFrequentPromisingSector"]["trendDirection"])
      ? (raw as TrendSummary["mostFrequentPromisingSector"]["trendDirection"])
      : "flat";

  const mostFrequentPromisingSector = asRecord(input.mostFrequentPromisingSector);
  const mostFrequentCautionSector = asRecord(input.mostFrequentCautionSector);

  return {
    mostFrequentPromisingSector: {
      sector: asString(mostFrequentPromisingSector.sector, "N/A"),
      appearances: asNumber(mostFrequentPromisingSector.appearances, 0),
      trendDirection: normalizeDirection(mostFrequentPromisingSector.trendDirection),
    },
    mostFrequentCautionSector: {
      sector: asString(mostFrequentCautionSector.sector, "N/A"),
      appearances: asNumber(mostFrequentCautionSector.appearances, 0),
      trendDirection: normalizeDirection(mostFrequentCautionSector.trendDirection),
    },
    repeatedStockIdeas: asArray(input.repeatedStockIdeas).map((item) => {
      const entry = asRecord(item);
      return {
        ticker: asString(entry.ticker, "N/A"),
        appearances: asNumber(entry.appearances, 0),
        direction: normalizeDirection(entry.direction),
      };
    }),
    promisingSectorSeries: asArray(input.promisingSectorSeries).map((item) => {
      const entry = asRecord(item);
      return {
        sector: asString(entry.sector, "N/A"),
        count: asNumber(entry.count, 0),
      };
    }),
    cautionSectorSeries: asArray(input.cautionSectorSeries).map((item) => {
      const entry = asRecord(item);
      return {
        sector: asString(entry.sector, "N/A"),
        count: asNumber(entry.count, 0),
      };
    }),
  };
}

export function normalizeDailyAnalysis(value: unknown): DailyAnalysis {
  const input = asRecord(value);
  const reasons = asRecord(input.reasons);

  return {
    date: asString(input.date, "업데이트 예정"),
    lastUpdated: asString(input.lastUpdated, new Date(0).toISOString()),
    marketTone: asOptionalString(input.marketTone),
    topOpportunity: asString(input.topOpportunity, "데이터 준비 중"),
    topRisk: asString(input.topRisk, "데이터 준비 중"),
    newPicksToday: asNumber(input.newPicksToday, 0),
    newCautionsToday: asNumber(input.newCautionsToday, 0),
    biggestChangeToday: isRecord(input.biggestChangeToday)
      ? {
          label: asString(input.biggestChangeToday.label, "변화 없음"),
          detail: asString(input.biggestChangeToday.detail, "상세 설명 없음"),
        }
      : asString(input.biggestChangeToday, "변화 없음"),
    promisingSectors: asArray(input.promisingSectors).map(normalizeSectorEntry),
    cautionSectors: asArray(input.cautionSectors).map(normalizeSectorEntry),
    changesSinceYesterday: asArray(input.changesSinceYesterday).map(normalizeChangeEvent),
    reasons: {
      macro: normalizeReasonBlock(reasons.macro, "거시"),
      policy: normalizeReasonBlock(reasons.policy, "정책 / 규제"),
      earnings: normalizeReasonBlock(reasons.earnings, "실적 / 가이던스"),
      flows: normalizeReasonBlock(reasons.flows, "수급 / 심리"),
    },
    checkpoints: asArray(input.checkpoints).map(normalizeCheckpointItem),
    smallCapIdeas: asArray(input.smallCapIdeas).map(normalizeSmallCapIdea),
    trendSummary: normalizeTrendSummary(input.trendSummary),
  };
}

function normalizeEvaluatedInsight(value: unknown): EvaluatedInsight {
  const input = asRecord(value);
  return {
    ticker: asString(input.ticker, "N/A"),
    companyName: asString(input.companyName, "이름 미확인"),
    market: asMarketCode(input.market, "GLOBAL"),
    sector: asString(input.sector, "미분류"),
    stance:
      typeof input.stance === "string" && RESULTS_STANCES.has(input.stance as EvaluatedInsight["stance"])
        ? (input.stance as EvaluatedInsight["stance"])
        : "promising",
    entryDate: asString(input.entryDate, "미정"),
    evaluationDate: asString(input.evaluationDate, "미정"),
    holdingPeriodDays: asNumber(input.holdingPeriodDays, 0),
    thesis: asString(input.thesis, "평가 논리 없음"),
    priceReturnPct: asNumber(input.priceReturnPct, 0),
    benchmarkReturnPct: asNumber(input.benchmarkReturnPct, 0),
    callAlphaPct: asNumber(input.callAlphaPct, 0),
    verdict:
      typeof input.verdict === "string" && RESULTS_VERDICTS.has(input.verdict as EvaluatedInsight["verdict"])
        ? (input.verdict as EvaluatedInsight["verdict"])
        : "mixed",
    priceEvidence:
      typeof input.priceEvidence === "string" && PRICE_EVIDENCE.has(input.priceEvidence as EvaluatedInsight["priceEvidence"])
        ? (input.priceEvidence as EvaluatedInsight["priceEvidence"])
        : "fallback",
    dataQuality:
      typeof input.dataQuality === "string" && DATA_QUALITY.has(input.dataQuality as EvaluatedInsight["dataQuality"])
        ? (input.dataQuality as EvaluatedInsight["dataQuality"])
        : "limited",
    benchmarkLabel: asOptionalString(input.benchmarkLabel),
    outcomeSummary: asString(input.outcomeSummary, "결과 요약 없음"),
    followThroughReview: asOptionalString(input.followThroughReview),
    lesson: asString(input.lesson, "교훈 없음"),
  };
}

function normalizeSectorReview(value: unknown): SectorReview {
  const input = asRecord(value);
  return {
    sectorName: asString(input.sectorName, "미분류"),
    market: asMarketCode(input.market, "GLOBAL"),
    priorView: input.priorView === "caution" ? "caution" : "promising",
    verdict:
      typeof input.verdict === "string" && RESULTS_VERDICTS.has(input.verdict as SectorReview["verdict"])
        ? (input.verdict as SectorReview["verdict"])
        : "mixed",
    callAlphaPct: asNumber(input.callAlphaPct, 0),
    detail: asString(input.detail, "섹터 평가 설명 없음"),
  };
}

export function normalizeWeeklyResultsReport(value: unknown): WeeklyResultsReport {
  const input = asRecord(value);
  const evaluationWindow = asRecord(input.evaluationWindow);
  const scorecard = asRecord(input.scorecard);
  const smallCapScorecard = asRecord(input.smallCapScorecard);

  return {
    reportDate: asString(input.reportDate, "업데이트 예정"),
    lastUpdated: asString(input.lastUpdated, new Date(0).toISOString()),
    evaluationWindow: {
      startDate: asString(evaluationWindow.startDate, "미정"),
      endDate: asString(evaluationWindow.endDate, "미정"),
      label: asString(evaluationWindow.label, "평가 구간 미정"),
    },
    overallVerdict: asString(input.overallVerdict, "주간 평가 데이터 준비 중"),
    summary: asString(input.summary, "주간 평가 요약이 아직 없습니다."),
    benchmarkNote: asString(input.benchmarkNote, "평가 기준 메모 없음"),
    scorecard: {
      evaluatedCount: asNumber(scorecard.evaluatedCount, 0),
      workedCount: asNumber(scorecard.workedCount, 0),
      mixedCount: asNumber(scorecard.mixedCount, 0),
      failedCount: asNumber(scorecard.failedCount, 0),
      averageCallAlphaPct: asNumber(scorecard.averageCallAlphaPct, 0),
      bestCall: asString(scorecard.bestCall, "기록 없음"),
      weakestCall: asString(scorecard.weakestCall, "기록 없음"),
    },
    smallCapScorecard: Object.keys(smallCapScorecard).length
      ? {
          evaluatedCount: asNumber(smallCapScorecard.evaluatedCount, 0),
          workedCount: asNumber(smallCapScorecard.workedCount, 0),
          mixedCount: asNumber(smallCapScorecard.mixedCount, 0),
          failedCount: asNumber(smallCapScorecard.failedCount, 0),
          averageCallAlphaPct: asNumber(smallCapScorecard.averageCallAlphaPct, 0),
        }
      : undefined,
    evaluatedInsights: asArray(input.evaluatedInsights).map(normalizeEvaluatedInsight),
    sectorReviews: asArray(input.sectorReviews).map(normalizeSectorReview),
    processTakeaways: asStringArray(input.processTakeaways),
    nextWeekFocus: asStringArray(input.nextWeekFocus),
  };
}
