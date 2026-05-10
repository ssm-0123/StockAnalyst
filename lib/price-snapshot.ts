import { CurrencyCode, MarketCode, StockPriceSnapshot } from "@/lib/types";

export type PriceSource = "yahoo" | "naver" | "naver-us" | "cache" | "fallback" | "missing";
export type PriceSnapshotMode = "normal" | "analysis_only" | "no_trade";
export type PriceSnapshotHealth = "fresh" | "stale" | "partial" | "missing" | "invalid";

export interface PriceSnapshotEntry {
  ticker: string;
  quoteSymbol?: string;
  companyName?: string;
  market: MarketCode;
  currency?: CurrencyCode;
  snapshot: StockPriceSnapshot;
  source: PriceSource;
  fallbackSource?: PriceSource;
  health: PriceSnapshotHealth;
  staleDays?: number;
  tradable: boolean;
  mode: PriceSnapshotMode;
  fetchedAt: string;
  issues: string[];
}

export interface PricesSnapshotFile {
  generatedAt: string;
  analysisDate: string;
  staleThresholdDays: number;
  mode: PriceSnapshotMode;
  summary: {
    total: number;
    fresh: number;
    stale: number;
    partial: number;
    missing: number;
    invalid: number;
    tradable: number;
    noTrade: number;
  };
  entries: PriceSnapshotEntry[];
}

export const PRICE_STALE_THRESHOLD_DAYS = 5;

export function priceSnapshotKey(market: MarketCode, ticker: string) {
  return `${market}:${ticker.trim().toUpperCase()}`;
}

export function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysBetween(reference: Date | null, candidate: Date | null) {
  if (!reference || !candidate) {
    return null;
  }

  return Math.floor((reference.getTime() - candidate.getTime()) / 86_400_000);
}
