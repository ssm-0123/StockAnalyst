export type StockStatus =
  | "new"
  | "hold"
  | "upgrade"
  | "downgrade"
  | "removed"
  | "up"
  | "down"
  | "no-change";

export type MarketCode = "KR" | "US" | "GLOBAL";
export type CurrencyCode = "KRW" | "USD";
export type ConfidenceLevel = "high" | "medium" | "low";
export type SnapshotHealth = "fresh" | "stale" | "partial" | "missing" | "invalid";
export type ValidationSeverity = "info" | "warning" | "critical";
export type ActionBias = "buy" | "hold" | "reduce" | "exit";
export type TimeHorizon = "1-3d" | "1-3w" | "1-3m";

export interface ValidationIssue {
  code: string;
  label: string;
  severity: ValidationSeverity;
  detail: string;
}

export interface ValidationSummary {
  totalIdeas: number;
  freshSnapshots: number;
  staleSnapshots: number;
  incompleteSnapshots: number;
  invalidSnapshots: number;
  highConfidenceIdeas: number;
  summary: string;
}

export interface StockPriceSnapshot {
  priceDate: string;
  currentPrice?: number;
  previousCloseChangePct?: number;
  week52High?: number;
  week52Low?: number;
  currency?: CurrencyCode;
  sourceNote?: string;
}

export interface StockIdea {
  ticker: string;
  quoteSymbol?: string;
  companyName: string;
  market: MarketCode;
  rationale: string;
  isNew?: boolean;
  change: StockStatus;
  actionBias?: ActionBias;
  timeHorizon?: TimeHorizon;
  invalidation?: string;
  positioningNote?: string;
  priceSnapshot?: StockPriceSnapshot;
  confidenceLevel?: ConfidenceLevel;
  snapshotHealth?: SnapshotHealth;
  validationIssues?: ValidationIssue[];
}

export interface SectorEntry {
  sectorName: string;
  market: MarketCode;
  rank: number;
  confidenceScore: number;
  thesis: string;
  keyDrivers?: string[];
  risks?: string[];
  headwinds?: string[];
  whatCouldImprove?: string[];
  stocks: StockIdea[];
  confidenceLevel?: ConfidenceLevel;
}

export interface ChangeEvent {
  type:
    | "upgrade"
    | "downgrade"
    | "new-stock"
    | "removed-stock"
    | "new-theme"
    | "fading-theme";
  title: string;
  detail: string;
}

export interface ReasonBlock {
  title: string;
  summary: string[];
  affectedSectors?: string[];
}

export interface CheckpointItem {
  category: "earnings" | "macro" | "policy" | "risk";
  market?: MarketCode;
  title: string;
  date: string;
  note: string;
}

export interface AnalysisSuggestion {
  title: string;
  action: "watch" | "trim" | "rotate" | "archive";
  detail: string;
  rationale: string;
  affectedSectors?: string[];
  source?: "automation" | "results-review";
  priority?: "high" | "medium";
}

export interface LegacySectorDecision {
  sectorName: string;
  market: MarketCode;
  previousBestRank: number;
  lastSeenDate: string;
  appearances14d: number;
  decision: "hold" | "reduce" | "exit" | "reenter-watch";
  rationale: string;
  triggerNote: string;
  resultsSummary?: string;
}

export interface SmallCapIdea {
  rank: number;
  ticker: string;
  quoteSymbol?: string;
  companyName: string;
  market: MarketCode;
  sector: string;
  theme: string;
  thesis: string;
  whyNow: string;
  followThroughNote?: string;
  actionBias?: ActionBias;
  timeHorizon?: TimeHorizon;
  invalidation?: string;
  positioningNote?: string;
  valuationNote: string;
  liquidityNote: string;
  catalysts: string[];
  risks: string[];
  priceSnapshot?: StockPriceSnapshot;
  confidenceLevel?: ConfidenceLevel;
  snapshotHealth?: SnapshotHealth;
  validationIssues?: ValidationIssue[];
}

export interface SmallCapTrackingMeta {
  ticker: string;
  consecutiveDays: number;
  appearances7d: number;
}

export interface WeeklyResultsScorecard {
  evaluatedCount: number;
  workedCount: number;
  mixedCount: number;
  failedCount: number;
  averageCallAlphaPct: number;
  bestCall: string;
  weakestCall: string;
}

export interface SmallCapResultsScorecard {
  evaluatedCount: number;
  workedCount: number;
  mixedCount: number;
  failedCount: number;
  averageCallAlphaPct: number;
}

export interface EvaluatedInsight {
  ticker: string;
  companyName: string;
  market: MarketCode;
  sector: string;
  stance: "promising" | "caution" | "small-cap";
  entryDate: string;
  evaluationDate: string;
  holdingPeriodDays: number;
  thesis: string;
  priceReturnPct: number;
  benchmarkReturnPct: number;
  callAlphaPct: number;
  verdict: "worked" | "mixed" | "failed";
  priceEvidence: "snapshot" | "fallback" | "mixed";
  dataQuality: "verified" | "limited" | "stale-excluded";
  benchmarkLabel?: string;
  outcomeSummary: string;
  followThroughReview?: string;
  lesson: string;
  confidenceLevel?: ConfidenceLevel;
}

export interface SectorReview {
  sectorName: string;
  market: MarketCode;
  priorView: "promising" | "caution";
  verdict: "worked" | "mixed" | "failed";
  callAlphaPct: number;
  detail: string;
}

export interface WeeklyResultsReport {
  reportDate: string;
  lastUpdated: string;
  evaluationWindow: {
    startDate: string;
    endDate: string;
    label: string;
  };
  overallVerdict: string;
  summary: string;
  benchmarkNote: string;
  scorecard: WeeklyResultsScorecard;
  smallCapScorecard?: SmallCapResultsScorecard;
  evaluatedInsights: EvaluatedInsight[];
  sectorReviews: SectorReview[];
  processTakeaways: string[];
  nextWeekFocus: string[];
  validationSummary?: ValidationSummary;
}

export interface DailyAnalysis {
  date: string;
  lastUpdated: string;
  marketTone?: string;
  topOpportunity: string;
  topRisk: string;
  newPicksToday: number;
  newCautionsToday: number;
  biggestChangeToday:
    | string
    | {
        label: string;
        detail: string;
      };
  promisingSectors: SectorEntry[];
  cautionSectors: SectorEntry[];
  changesSinceYesterday: ChangeEvent[];
  reasons: {
    macro: ReasonBlock;
    policy: ReasonBlock;
    earnings: ReasonBlock;
    flows: ReasonBlock;
  };
  checkpoints: CheckpointItem[];
  analysisSuggestions?: AnalysisSuggestion[];
  legacySectorDecisions?: LegacySectorDecision[];
  smallCapIdeas?: SmallCapIdea[];
  trendSummary?: TrendSummary;
  validationSummary?: ValidationSummary;
}

export interface TrendSummary {
  mostFrequentPromisingSector: {
    sector: string;
    appearances: number;
    trendDirection: "up" | "down" | "flat";
  };
  mostFrequentCautionSector: {
    sector: string;
    appearances: number;
    trendDirection: "up" | "down" | "flat";
  };
  repeatedStockIdeas: Array<{
    ticker: string;
    appearances: number;
    direction: "up" | "down" | "flat";
  }>;
  promisingSectorSeries: Array<{
    sector: string;
    count: number;
  }>;
  cautionSectorSeries: Array<{
    sector: string;
    count: number;
  }>;
}
