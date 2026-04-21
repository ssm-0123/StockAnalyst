import { MarketCode } from "@/lib/types";

export function getMarketLabel(market: MarketCode) {
  if (market === "KR") {
    return "한국";
  }

  if (market === "US") {
    return "미국";
  }

  return "글로벌";
}

export function getMarketBadgeVariant(market: MarketCode) {
  if (market === "KR") {
    return "accent" as const;
  }

  if (market === "US") {
    return "neutral" as const;
  }

  return "default" as const;
}
