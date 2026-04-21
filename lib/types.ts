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
  priceSnapshot?: StockPriceSnapshot;
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
  valuationNote: string;
  liquidityNote: string;
  catalysts: string[];
  risks: string[];
  priceSnapshot?: StockPriceSnapshot;
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
  outcomeSummary: string;
  lesson: string;
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
  evaluatedInsights: EvaluatedInsight[];
  sectorReviews: SectorReview[];
  processTakeaways: string[];
  nextWeekFocus: string[];
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
  smallCapIdeas?: SmallCapIdea[];
  trendSummary?: TrendSummary;
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
