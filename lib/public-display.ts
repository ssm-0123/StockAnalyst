import type { ActionBias, StockPriceSnapshot } from "@/lib/types";

export function actionBiasLabel(actionBias?: ActionBias) {
  if (actionBias === "buy") return "관심";
  if (actionBias === "hold") return "관찰";
  if (actionBias === "reduce") return "주의축소";
  if (actionBias === "exit") return "제외";
  return null;
}

export function priceSourceLabel(snapshot?: StockPriceSnapshot, fallback = "분석 시점 가격 스냅샷입니다.") {
  const note = snapshot?.sourceNote;

  if (!note) {
    return fallback;
  }

  const source = note.includes("Naver Finance KR")
    ? "Naver Finance 국내 시세"
    : note.includes("Naver US") || note.includes("worldstock")
      ? "Naver Finance 해외 시세"
      : note.includes("Yahoo")
        ? "Yahoo Finance"
        : "가격 스냅샷";
  const quality = note.includes("일부 가격 필드 누락") || note.includes("health=partial") ? "일부 항목 누락" : null;

  return quality ? `가격 출처: ${source} · ${quality}` : `가격 출처: ${source}`;
}
