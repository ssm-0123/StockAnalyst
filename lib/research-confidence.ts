import type { DailyAnalysis } from "@/lib/types";

type ConfidenceTone = "strong" | "constructive" | "watch" | "weak";

export type ConfidenceBreakdown = {
  score: number;
  label: string;
  tone: ConfidenceTone;
  positives: string[];
  negatives: string[];
};

function clampScore(value: number) {
  return Math.min(95, Math.max(35, Math.round(value)));
}

function confidenceLabel(score: number) {
  if (score >= 85) return { label: "강한 근거", tone: "strong" as const };
  if (score >= 70) return { label: "우호적 근거", tone: "constructive" as const };
  if (score >= 55) return { label: "확인 필요", tone: "watch" as const };
  return { label: "근거 약함", tone: "weak" as const };
}

function dataFreshness(latest: DailyAnalysis) {
  const validation = latest.validationSummary;
  if (!validation?.totalIdeas) return 70;
  return (validation.freshSnapshots / validation.totalIdeas) * 100;
}

function highConfidenceShare(latest: DailyAnalysis) {
  const validation = latest.validationSummary;
  if (!validation?.totalIdeas) return 50;
  return (validation.highConfidenceIdeas / validation.totalIdeas) * 100;
}

function compactFactors(items: string[]) {
  return items.slice(0, 3);
}

export function buildForwardConfidence(latest: DailyAnalysis): ConfidenceBreakdown {
  const regime = latest.marketRegime;
  const topSector = latest.promisingSectors[0];
  const topTheme = latest.themeRadar?.[0];

  const rotation = regime?.rotationProbability ?? 50;
  const riskReward = regime?.riskReward ?? 50;
  const crowdedness = regime?.crowdedness ?? 60;
  const fragility = regime?.fragilityScore ?? 60;
  const sectorConfidence = topSector?.confidenceScore ?? 60;
  const themeSignal = topTheme?.signalStrength ?? 60;
  const freshness = dataFreshness(latest);
  const highConfidence = highConfidenceShare(latest);

  const raw =
    52 +
    (rotation - 50) * 0.32 +
    (riskReward - 50) * 0.28 +
    (sectorConfidence - 50) * 0.2 +
    (themeSignal - 50) * 0.18 +
    (freshness - 70) * 0.08 +
    (highConfidence - 50) * 0.05 -
    Math.max(0, crowdedness - 65) * 0.18 -
    Math.max(0, fragility - 60) * 0.22 +
    Math.max(0, 60 - crowdedness) * 0.06 +
    Math.max(0, 55 - fragility) * 0.08;

  const score = clampScore(raw);
  const { label, tone } = confidenceLabel(score);
  const positives = compactFactors([
    rotation >= 70 ? "자금 이동 신호 강함" : "",
    riskReward >= 70 ? "위험 대비 보상 우호적" : "",
    sectorConfidence >= 78 ? "상위 섹터 확신도 높음" : "",
    themeSignal >= 75 ? "테마 신호 강함" : "",
    freshness >= 95 ? "가격 데이터 최신" : "",
    crowdedness <= 55 ? "쏠림 부담 낮음" : "",
    fragility <= 50 ? "시장 취약도 낮음" : "",
  ].filter(Boolean));
  const negatives = compactFactors([
    crowdedness >= 70 ? "쏠림도 높아 추격 부담" : "",
    fragility >= 65 ? "취약도 상승" : "",
    riskReward <= 55 ? "위험 대비 보상 제한" : "",
    rotation < 60 ? "자금 이동 신호 약함" : "",
    themeSignal < 65 ? "테마 신호 확인 필요" : "",
    freshness < 90 ? "가격 데이터 확인 필요" : "",
  ].filter(Boolean));

  return { score, label, tone, positives, negatives };
}

export function buildRegimeConfidence(latest: DailyAnalysis): ConfidenceBreakdown {
  const regime = latest.marketRegime;
  const topSector = latest.promisingSectors[0];
  const topTheme = latest.themeRadar?.[0];

  if (!regime) {
    const fallback = clampScore(topSector?.confidenceScore ?? 50);
    const { label, tone } = confidenceLabel(fallback);
    return {
      score: fallback,
      label,
      tone,
      positives: topSector ? ["상위 섹터 데이터 존재"] : [],
      negatives: ["시장 국면 데이터 부족"],
    };
  }

  const rotation = regime.rotationProbability;
  const riskReward = regime.riskReward;
  const crowdedness = regime.crowdedness;
  const fragility = regime.fragilityScore;
  const sectorConfidence = topSector?.confidenceScore ?? 60;
  const themeSignal = topTheme?.signalStrength ?? 60;
  const freshness = dataFreshness(latest);

  const raw =
    52 +
    (rotation - 50) * 0.3 +
    (riskReward - 50) * 0.26 +
    (sectorConfidence - 50) * 0.14 +
    (themeSignal - 50) * 0.12 +
    (freshness - 70) * 0.08 -
    Math.max(0, crowdedness - 65) * 0.22 -
    Math.max(0, fragility - 60) * 0.28 +
    Math.max(0, 60 - crowdedness) * 0.08 +
    Math.max(0, 55 - fragility) * 0.1;

  const score = clampScore(raw);
  const { label, tone } = confidenceLabel(score);
  const positives = compactFactors([
    rotation >= 70 ? "순환 확률 높음" : "",
    riskReward >= 70 ? "보상 우위" : "",
    sectorConfidence >= 78 ? "섹터 근거 강함" : "",
    themeSignal >= 75 ? "테마 반응 확인" : "",
    freshness >= 95 ? "가격 데이터 최신" : "",
    crowdedness <= 55 ? "쏠림 부담 낮음" : "",
    fragility <= 50 ? "취약도 낮음" : "",
  ].filter(Boolean));
  const negatives = compactFactors([
    crowdedness >= 70 ? "쏠림도 높음" : "",
    fragility >= 65 ? "취약도 높음" : "",
    riskReward <= 55 ? "보상 제한" : "",
    rotation < 60 ? "순환 신호 약함" : "",
    freshness < 90 ? "가격 데이터 확인 필요" : "",
  ].filter(Boolean));

  return { score, label, tone, positives, negatives };
}
