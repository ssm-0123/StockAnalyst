import { ArrowDown, ArrowRight, ArrowUp, GitCompareArrows } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DailyAnalysis, MarketRegimeAssessment } from "@/lib/types";

function stageLabel(stage?: MarketRegimeAssessment["stage"]) {
  if (stage === "early") return "Early";
  if (stage === "late") return "Late";
  return "Mid";
}

function metricDelta(current?: number, previous?: number) {
  if (typeof current !== "number" || typeof previous !== "number") return null;
  return Math.round(current - previous);
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <Badge variant="neutral">n/a</Badge>;
  if (value > 0) {
    return (
      <Badge variant="caution">
        <ArrowUp className="size-3.5" /> +{value}
      </Badge>
    );
  }
  if (value < 0) {
    return (
      <Badge variant="positive">
        <ArrowDown className="size-3.5" /> {value}
      </Badge>
    );
  }
  return <Badge variant="neutral">0</Badge>;
}

function rotationChanges(current: string[] = [], previous: string[] = []) {
  const previousSet = new Set(previous);
  const currentSet = new Set(current);
  return {
    added: current.filter((item) => !previousSet.has(item)).slice(0, 3),
    removed: previous.filter((item) => !currentSet.has(item)).slice(0, 3),
  };
}

function splitLabel(value: string) {
  return value.includes("|") ? value.split("|").map((part) => part.trim()).filter(Boolean).at(-1) ?? value : value;
}

function interpretation(current: MarketRegimeAssessment, previous?: MarketRegimeAssessment) {
  if (!previous) {
    return "이전 리포트가 충분하지 않아 이번 리포트의 현재 국면을 기준점으로 저장합니다.";
  }

  const crowdedness = metricDelta(current.crowdedness, previous.crowdedness) ?? 0;
  const riskReward = metricDelta(current.riskReward, previous.riskReward) ?? 0;
  const fragility = metricDelta(current.fragilityScore, previous.fragilityScore) ?? 0;
  const rotation = metricDelta(current.rotationProbability, previous.rotationProbability) ?? 0;

  if (crowdedness >= 8 && riskReward <= -5) {
    return "주도 테마 혼잡도는 높아졌고 위험 대비 보상은 약해져, 신규 추격보다 다음 순환 후보 확인이 더 중요합니다.";
  }
  if (fragility >= 8) {
    return "시장 취약성이 올라가고 있어 강한 테마 안에서도 가격 완충과 무효화 조건을 더 엄격히 봐야 합니다.";
  }
  if (rotation >= 8) {
    return "자금 순환 확률이 올라가 기존 주도주보다 다음 후보군의 상대강도 변화를 우선 확인합니다.";
  }
  if (riskReward >= 5 && fragility <= 0) {
    return "위험 대비 보상이 개선되고 취약성은 커지지 않아, 확인된 촉매의 후속 확산을 볼 수 있는 구간입니다.";
  }
  if (current.stage !== previous.stage) {
    return "시장 단계가 바뀌었으므로 기존 섹터 판단을 그대로 복제하기보다 현재 breadth와 positioning을 다시 확인합니다.";
  }
  return "큰 국면은 유지되지만 세부 점수가 바뀌어 다음 순환 후보와 과열 리스크를 함께 재점검합니다.";
}

function MetricChange({ label, current, previous }: { label: string; current?: number; previous?: number }) {
  const delta = metricDelta(current, previous);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-lg font-semibold text-slate-950">{typeof current === "number" ? Math.round(current) : "n/a"}</p>
        <DeltaBadge value={delta} />
      </div>
      <p className="mt-1 text-xs text-slate-500">prev {typeof previous === "number" ? Math.round(previous) : "n/a"}</p>
    </div>
  );
}

function changeItems(latest: DailyAnalysis, current: MarketRegimeAssessment, previous?: MarketRegimeAssessment) {
  if (!previous) {
    return [
      {
        change: "이번 리포트를 새 기준점으로 저장합니다.",
        impact: `Bullish/Watch for ${splitLabel(current.nextRotation?.[0] ?? latest.topOpportunity)}`,
      },
    ];
  }

  const items: Array<{ change: string; impact: string }> = [];
  const crowdedness = metricDelta(current.crowdedness, previous.crowdedness) ?? 0;
  const riskReward = metricDelta(current.riskReward, previous.riskReward) ?? 0;
  const fragility = metricDelta(current.fragilityScore, previous.fragilityScore) ?? 0;
  const rotation = metricDelta(current.rotationProbability, previous.rotationProbability) ?? 0;
  const firstRotation = splitLabel(current.nextRotation?.[0] ?? latest.topOpportunity);

  if (current.stage !== previous.stage) {
    items.push({
      change: `Market stage moved from ${stageLabel(previous.stage)} to ${stageLabel(current.stage)}.`,
      impact: `Re-price exposure toward ${firstRotation}`,
    });
  }
  if (rotation >= 3) {
    items.push({
      change: "Rotation pressure strengthened versus the previous report.",
      impact: `Bullish for ${firstRotation}`,
    });
  }
  if (crowdedness >= 3) {
    items.push({
      change: "Crowdedness increased in current leadership.",
      impact: `Avoid chasing ${splitLabel(latest.topRisk)}`,
    });
  }
  if (riskReward <= -3) {
    items.push({
      change: "Risk/reward deteriorated from the previous report.",
      impact: "Favor price discipline and pullback entries",
    });
  } else if (riskReward >= 3) {
    items.push({
      change: "Risk/reward improved from the previous report.",
      impact: `Constructive for ${firstRotation}`,
    });
  }
  if (fragility >= 3) {
    items.push({
      change: "Fragility rose, making weak follow-through more expensive.",
      impact: "Bearish for overcrowded leaders",
    });
  }

  if (!items.length) {
    items.push({
      change: "The broad regime is stable, but rotation candidates changed at the margin.",
      impact: `Neutral-to-constructive for ${firstRotation}`,
    });
  }

  return items.slice(0, 3);
}

export function RegimeChangePanel({
  latest,
  previousDay,
}: {
  latest: DailyAnalysis;
  previousDay: DailyAnalysis | null;
}) {
  const current = latest.marketRegime;
  const previous = previousDay?.marketRegime;

  if (!current) return null;

  const rotations = rotationChanges(current.nextRotation, previous?.nextRotation);
  const changes = changeItems(latest, current, previous);

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <GitCompareArrows className="size-4" />
            What Changed
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">지난 리포트 이후 바뀐 국면</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{interpretation(current, previous)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{previousDay?.date ?? "no previous"}</Badge>
          <ArrowRight className="size-4 text-slate-400" />
          <Badge variant="positive">{latest.date}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {changes.map((item, index) => (
          <div key={`regime-change-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Change {index + 1}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{item.change}</p>
            <div className="mt-3 rounded-xl border border-white bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Market Impact</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{item.impact}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Stage</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{previous ? stageLabel(previous.stage) : "n/a"}</Badge>
            <ArrowRight className="size-4 text-slate-400" />
            <Badge variant={previous?.stage === current.stage ? "neutral" : "positive"}>{stageLabel(current.stage)}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            현재 판단은 이전 리포트의 국면을 기준점으로 삼아 혼잡도, 취약성, 순환 확률의 변화를 다시 읽습니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricChange label="Crowdedness" current={current.crowdedness} previous={previous?.crowdedness} />
          <MetricChange label="Risk Reward" current={current.riskReward} previous={previous?.riskReward} />
          <MetricChange label="Rotation" current={current.rotationProbability} previous={previous?.rotationProbability} />
          <MetricChange label="Fragility" current={current.fragilityScore} previous={previous?.fragilityScore} />
        </div>
      </div>

      {rotations.added.length || rotations.removed.length ? (
        <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {rotations.added.map((item) => (
            <Badge key={`added-${item}`} variant="positive">새 순환 후보 {item}</Badge>
          ))}
          {rotations.removed.map((item) => (
            <Badge key={`removed-${item}`} variant="neutral">이탈 후보 {item}</Badge>
          ))}
        </div>
      ) : null}
    </section>
  );
}
