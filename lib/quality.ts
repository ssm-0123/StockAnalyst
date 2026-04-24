import {
  ConfidenceLevel,
  DailyAnalysis,
  EvaluatedInsight,
  SectorEntry,
  SmallCapIdea,
  SnapshotHealth,
  StockIdea,
  StockPriceSnapshot,
  ValidationIssue,
  ValidationSummary,
  WeeklyResultsReport,
} from "@/lib/types";

const STALE_THRESHOLD_DAYS = 5;
const EXTREME_DAILY_MOVE_PCT = 30;

type SnapshotAssessment = {
  health: SnapshotHealth;
  issues: ValidationIssue[];
};

function safeDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dayDiff(reference: Date | null, candidate: Date | null) {
  if (!reference || !candidate) {
    return null;
  }

  return Math.floor((reference.getTime() - candidate.getTime()) / 86_400_000);
}

function pushIssue(issues: ValidationIssue[], issue: ValidationIssue) {
  issues.push(issue);
}

export function assessPriceSnapshot(
  snapshot: StockPriceSnapshot | undefined,
  analysisDate: string,
): SnapshotAssessment {
  const issues: ValidationIssue[] = [];

  if (!snapshot) {
    pushIssue(issues, {
      code: "missing-snapshot",
      label: "가격 누락",
      severity: "critical",
      detail: "분석 시점 가격 스냅샷이 없습니다.",
    });

    return { health: "missing", issues };
  }

  const hasCurrentPrice = typeof snapshot.currentPrice === "number";
  const hasChange = typeof snapshot.previousCloseChangePct === "number";
  const hasRange =
    typeof snapshot.week52High === "number" && typeof snapshot.week52Low === "number";
  const snapshotDate = safeDate(snapshot.priceDate);
  const referenceDate = safeDate(analysisDate);
  const staleDays = dayDiff(referenceDate, snapshotDate);

  if (!hasCurrentPrice && !hasChange && !hasRange) {
    pushIssue(issues, {
      code: "missing-snapshot-values",
      label: "핵심 수치 없음",
      severity: "critical",
      detail: "가격 스냅샷이 있지만 핵심 숫자가 비어 있습니다.",
    });
    return { health: "missing", issues };
  }

  if (!hasCurrentPrice || !hasChange || !hasRange) {
    pushIssue(issues, {
      code: "partial-snapshot",
      label: "불완전 스냅샷",
      severity: "warning",
      detail: "현재가, 전일 대비, 52주 범위 중 일부가 비어 있습니다.",
    });
  }

  if (typeof staleDays === "number" && staleDays > STALE_THRESHOLD_DAYS) {
    pushIssue(issues, {
      code: "stale-snapshot",
      label: "stale 가격",
      severity: "warning",
      detail: `${staleDays}일 지난 가격이라 현재 판단 근거로 약합니다.`,
    });
  }

  if (
    typeof snapshot.currentPrice === "number" &&
    typeof snapshot.week52High === "number" &&
    snapshot.currentPrice > snapshot.week52High * 1.03
  ) {
    pushIssue(issues, {
      code: "price-above-52w-high",
      label: "범위 이탈",
      severity: "critical",
      detail: "현재가가 52주 최고 범위를 비정상적으로 초과합니다.",
    });
  }

  if (
    typeof snapshot.currentPrice === "number" &&
    typeof snapshot.week52Low === "number" &&
    snapshot.currentPrice < snapshot.week52Low * 0.97
  ) {
    pushIssue(issues, {
      code: "price-below-52w-low",
      label: "범위 이탈",
      severity: "critical",
      detail: "현재가가 52주 최저 범위를 비정상적으로 하회합니다.",
    });
  }

  if (
    typeof snapshot.previousCloseChangePct === "number" &&
    Math.abs(snapshot.previousCloseChangePct) > EXTREME_DAILY_MOVE_PCT
  ) {
    pushIssue(issues, {
      code: "extreme-daily-move",
      label: "등락률 이상치",
      severity: "critical",
      detail: `전거래일 대비 ${snapshot.previousCloseChangePct.toFixed(2)}%는 이상치로 봐야 합니다.`,
    });
  }

  if (issues.some((issue) => issue.severity === "critical")) {
    return { health: "invalid", issues };
  }

  if (issues.some((issue) => issue.code === "stale-snapshot")) {
    return { health: "stale", issues };
  }

  if (issues.some((issue) => issue.code === "partial-snapshot")) {
    return { health: "partial", issues };
  }

  return { health: "fresh", issues };
}

function confidenceFromScore(score: number): ConfidenceLevel {
  if (score >= 4) {
    return "high";
  }

  if (score >= 2) {
    return "medium";
  }

  return "low";
}

function ideaConfidence(snapshot: SnapshotAssessment, rationale: string) {
  let score = 0;

  if (snapshot.health === "fresh") {
    score += 3;
  } else if (snapshot.health === "partial") {
    score += 1;
  } else if (snapshot.health === "stale") {
    score += 1;
  }

  if (!snapshot.issues.some((issue) => issue.severity === "critical")) {
    score += 1;
  }

  if (rationale.trim().length >= 45) {
    score += 1;
  }

  return confidenceFromScore(score);
}

export function enrichStockIdea(stock: StockIdea, analysisDate: string): StockIdea {
  const snapshot = assessPriceSnapshot(stock.priceSnapshot, analysisDate);

  return {
    ...stock,
    snapshotHealth: snapshot.health,
    validationIssues: snapshot.issues,
    confidenceLevel: ideaConfidence(snapshot, stock.rationale),
  };
}

export function enrichSmallCapIdea(idea: SmallCapIdea, analysisDate: string): SmallCapIdea {
  const snapshot = assessPriceSnapshot(idea.priceSnapshot, analysisDate);
  const combinedRationale = `${idea.thesis} ${idea.whyNow} ${idea.followThroughNote ?? ""}`;

  return {
    ...idea,
    snapshotHealth: snapshot.health,
    validationIssues: snapshot.issues,
    confidenceLevel: ideaConfidence(snapshot, combinedRationale),
  };
}

export function enrichSectorEntry(sector: SectorEntry, analysisDate: string): SectorEntry {
  const stocks = sector.stocks.map((stock) => enrichStockIdea(stock, analysisDate));
  const highConfidenceStocks = stocks.filter((stock) => stock.confidenceLevel === "high").length;
  const lowConfidenceStocks = stocks.filter((stock) => stock.confidenceLevel === "low").length;

  let score = sector.confidenceScore >= 80 ? 3 : sector.confidenceScore >= 65 ? 2 : 1;
  score += highConfidenceStocks >= 2 ? 1 : 0;
  score -= lowConfidenceStocks >= 2 ? 1 : 0;

  return {
    ...sector,
    stocks,
    confidenceLevel: confidenceFromScore(score),
  };
}

function countHealth(values: Array<{ snapshotHealth?: SnapshotHealth; confidenceLevel?: ConfidenceLevel }>) {
  return values.reduce(
    (acc, item) => {
      if (item.snapshotHealth === "fresh") acc.freshSnapshots += 1;
      if (item.snapshotHealth === "stale") acc.staleSnapshots += 1;
      if (item.snapshotHealth === "partial" || item.snapshotHealth === "missing") acc.incompleteSnapshots += 1;
      if (item.snapshotHealth === "invalid") acc.invalidSnapshots += 1;
      if (item.confidenceLevel === "high") acc.highConfidenceIdeas += 1;
      acc.totalIdeas += 1;
      return acc;
    },
    {
      totalIdeas: 0,
      freshSnapshots: 0,
      staleSnapshots: 0,
      incompleteSnapshots: 0,
      invalidSnapshots: 0,
      highConfidenceIdeas: 0,
    } satisfies Omit<ValidationSummary, "summary">,
  );
}

function buildValidationSummary(counts: Omit<ValidationSummary, "summary">): ValidationSummary {
  const summary =
    counts.invalidSnapshots > 0
      ? `이상치 ${counts.invalidSnapshots}건이 있어 숫자는 보수적으로 해석해야 합니다.`
      : counts.staleSnapshots > 0
        ? `stale 가격 ${counts.staleSnapshots}건이 있어 일부 판단은 신선도가 떨어집니다.`
        : counts.incompleteSnapshots > 0
          ? `불완전 스냅샷 ${counts.incompleteSnapshots}건이 있어 일부 종목은 참고용입니다.`
          : `${counts.highConfidenceIdeas}개 아이디어가 고신뢰 조건을 충족합니다.`;

  return {
    ...counts,
    summary,
  };
}

export function enrichDailyAnalysis(analysis: DailyAnalysis): DailyAnalysis {
  const promisingSectors = analysis.promisingSectors.map((sector) => enrichSectorEntry(sector, analysis.date));
  const cautionSectors = analysis.cautionSectors.map((sector) => enrichSectorEntry(sector, analysis.date));
  const smallCapIdeas = analysis.smallCapIdeas?.map((idea) => enrichSmallCapIdea(idea, analysis.date)) ?? [];
  const counts = countHealth([
    ...promisingSectors.flatMap((sector) => sector.stocks),
    ...cautionSectors.flatMap((sector) => sector.stocks),
    ...smallCapIdeas,
  ]);

  return {
    ...analysis,
    promisingSectors,
    cautionSectors,
    smallCapIdeas,
    validationSummary: buildValidationSummary(counts),
  };
}

function resultsConfidence(item: EvaluatedInsight): ConfidenceLevel {
  if (item.dataQuality === "verified" && item.priceEvidence === "snapshot") {
    return "high";
  }

  if (item.dataQuality === "stale-excluded" || item.priceEvidence === "fallback") {
    return "low";
  }

  return "medium";
}

function fallbackBenchmarkLabel(item: EvaluatedInsight) {
  if (item.stance === "small-cap") {
    return item.market === "KR" ? "KR 중소형 관찰군" : "US 중소형 관찰군";
  }

  if (item.market === "KR") {
    return `KR ${item.sector} 관찰군`;
  }

  if (item.market === "US") {
    return `US ${item.sector} 대형주 관찰군`;
  }

  return `${item.sector} 관찰군`;
}

export function enrichWeeklyResultsReport(report: WeeklyResultsReport): WeeklyResultsReport {
  const evaluatedInsights = report.evaluatedInsights.map((item) => ({
    ...item,
    benchmarkLabel: item.benchmarkLabel ?? fallbackBenchmarkLabel(item),
    confidenceLevel: resultsConfidence(item),
  }));

  const validationSummary = buildValidationSummary(
    evaluatedInsights.reduce(
      (acc, item) => {
        if (item.dataQuality === "verified") acc.freshSnapshots += 1;
        if (item.dataQuality === "stale-excluded") acc.staleSnapshots += 1;
        if (item.dataQuality === "limited") acc.incompleteSnapshots += 1;
        if (item.priceEvidence === "fallback") acc.invalidSnapshots += 1;
        if (item.confidenceLevel === "high") acc.highConfidenceIdeas += 1;
        acc.totalIdeas += 1;
        return acc;
      },
      {
        totalIdeas: 0,
        freshSnapshots: 0,
        staleSnapshots: 0,
        incompleteSnapshots: 0,
        invalidSnapshots: 0,
        highConfidenceIdeas: 0,
      } satisfies Omit<ValidationSummary, "summary">,
    ),
  );

  return {
    ...report,
    evaluatedInsights,
    validationSummary,
  };
}
