import { AlertTriangle, ArrowRight, Gauge, Layers3, Radar, Shield, Shuffle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DailyAnalysis, MarketRegimeAssessment } from "@/lib/types";

function stageLabel(stage?: MarketRegimeAssessment["stage"]) {
  if (stage === "early") return "Early";
  if (stage === "late") return "Late";
  return "Mid";
}

function stageDescription(stage?: MarketRegimeAssessment["stage"]) {
  if (stage === "early") return "위험 선호가 막 회복되는 구간";
  if (stage === "late") return "강한 흐름이 이미 많이 반영된 구간";
  return "주도 섹터가 확산되는 중간 구간";
}

function clampScore(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function scoreTone(value: number, inverse = false) {
  const high = inverse ? value <= 40 : value >= 70;
  const low = inverse ? value >= 70 : value <= 40;
  if (high) return "bg-emerald-600";
  if (low) return "bg-rose-600";
  return "bg-amber-500";
}

function MetricBar({
  label,
  value,
  note,
  inverse,
}: {
  label: string;
  value?: number;
  note: string;
  inverse?: boolean;
}) {
  const score = clampScore(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-950">{score}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${scoreTone(score, inverse)}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
}

export function MarketRegimeConsole({ latest }: { latest: DailyAnalysis }) {
  const regime = latest.marketRegime;
  const topTheme = latest.themeRadar?.[0];

  if (!regime) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white shadow-panel sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral" className="border-white/10 bg-white/10 text-slate-200">
              AI Market Intelligence
            </Badge>
            <Badge variant="positive">Current Regime</Badge>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
            {stageLabel(regime.stage)} Market Regime
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{stageDescription(regime.stage)}</p>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100 sm:text-lg">{regime.summary}</p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <Radar className="size-4" />
                Top Theme
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-white">{topTheme?.theme ?? latest.topOpportunity}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <AlertTriangle className="size-4" />
                Key Risk
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-white">{latest.topRisk}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/95 p-4 text-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Gauge className="size-4" />
                Regime Console
              </div>
              <p className="mt-2 text-sm text-slate-600">국면, 혼잡도, 취약성을 함께 봅니다.</p>
            </div>
            <Badge variant="neutral">{latest.date}</Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricBar label="Crowdedness" value={regime.crowdedness} note="주도 테마에 가격과 관심이 얼마나 몰렸는지" inverse />
            <MetricBar label="Risk Reward" value={regime.riskReward} note="현재 가격에서 남은 보상 대비 위험" />
            <MetricBar label="Rotation" value={regime.rotationProbability} note="다음 섹터로 자금이 이동할 가능성" />
            <MetricBar label="Fragility" value={regime.fragilityScore} note="작은 충격에 흔들릴 수 있는 정도" inverse />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Layers3 className="size-4" />
                Breadth
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{regime.breadth}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Shield className="size-4" />
                Positioning
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{regime.positioning}</p>
            </div>
          </div>

          {regime.nextRotation?.length ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Shuffle className="size-4" />
                Expected Rotation
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {regime.nextRotation.slice(0, 4).map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-center gap-2">
                    <Badge variant={index === 0 ? "positive" : "neutral"}>{item}</Badge>
                    {index < Math.min(regime.nextRotation.length, 4) - 1 ? (
                      <ArrowRight className="size-4 text-slate-400" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
