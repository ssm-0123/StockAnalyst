import { AlertTriangle, CalendarDays, Gauge, Layers3, Shield } from "lucide-react";

import { TermHint } from "@/components/term-hint";
import { Badge } from "@/components/ui/badge";
import { buildRegimeConfidence } from "@/lib/research-confidence";
import type { DailyAnalysis, MarketRegimeAssessment } from "@/lib/types";

function stageLabel(stage?: MarketRegimeAssessment["stage"]) {
  if (stage === "early") return "초기";
  if (stage === "late") return "후기";
  return "중기";
}

function clampScore(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function riskLevel(regime: MarketRegimeAssessment) {
  if (regime.fragilityScore >= 78 || regime.crowdedness >= 85 || regime.riskReward <= 45) return "High";
  if (regime.fragilityScore >= 60 || regime.crowdedness >= 65 || regime.riskReward <= 60) return "Medium";
  return "Low";
}

function riskLabel(value: string) {
  if (value === "High") return "위험 높음";
  if (value === "Low") return "위험 낮음";
  return "위험 보통";
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function regimeDurationDays(latest: DailyAnalysis, history: DailyAnalysis[] = []) {
  const stage = latest.marketRegime?.stage;
  if (!stage) return 1;

  const byDate = new Map<string, DailyAnalysis>();
  for (const entry of [latest, ...history]) {
    const current = byDate.get(entry.date);
    if (!current || (entry.lastUpdated ?? "") > (current.lastUpdated ?? "")) {
      byDate.set(entry.date, entry);
    }
  }

  const entries = Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  let oldestDate = latest.date;

  for (const entry of entries) {
    if (entry.marketRegime?.stage !== stage) break;
    oldestDate = entry.date;
  }

  const start = parseDate(oldestDate);
  const end = parseDate(latest.date);
  if (!start || !end) return entries.filter((entry) => entry.marketRegime?.stage === stage).length;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function scoreTone(value: number, inverse = false) {
  const high = inverse ? value <= 40 : value >= 70;
  const low = inverse ? value >= 70 : value <= 40;
  if (high) return "bg-emerald-600";
  if (low) return "bg-rose-600";
  return "bg-amber-500";
}

function Metric({
  label,
  value,
  inverse,
  help,
  direction,
}: {
  label: string;
  value?: number;
  inverse?: boolean;
  help: string;
  direction: string;
}) {
  const score = clampScore(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" title={help}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-950">{score}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${scoreTone(score, inverse)}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-[11px] font-medium leading-4 text-slate-500">{direction}</p>
    </div>
  );
}

export function MarketRegimeConsole({
  latest,
  history = [],
}: {
  latest: DailyAnalysis;
  history?: DailyAnalysis[];
}) {
  const regime = latest.marketRegime;
  if (!regime) return null;

  const confidence = buildRegimeConfidence(latest);
  const duration = regimeDurationDays(latest, history);
  const risk = riskLevel(regime);

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <Gauge className="size-4" />
            현재 시장 국면
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {stageLabel(regime.stage)} 시장 국면
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{regime.summary}</p>
        </div>
        <Badge variant={risk === "High" ? "caution" : risk === "Low" ? "positive" : "neutral"}>{riskLabel(risk)}</Badge>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Shield className="size-4" />
              <TermHint label="판단 신뢰도" description="현재 국면, 상위 섹터, 테마 신호를 함께 본 리서치 확신도입니다. 주문 신호가 아니라 근거 강도입니다." />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold text-slate-950">{confidence.score}%</p>
              <Badge variant={confidence.tone === "weak" ? "caution" : confidence.tone === "watch" ? "neutral" : "positive"}>
                {confidence.label}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2">
              <p className="rounded-lg bg-emerald-50 px-2 py-1.5 text-xs leading-5 text-emerald-800">
                + {confidence.positives.length ? confidence.positives.join(" · ") : "강한 가산 요인 없음"}
              </p>
              <p className="rounded-lg bg-rose-50 px-2 py-1.5 text-xs leading-5 text-rose-800">
                - {confidence.negatives.length ? confidence.negatives.join(" · ") : "큰 감점 요인 없음"}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <CalendarDays className="size-4" />
              <TermHint label="국면 지속 기간" description="같은 시장 단계가 며칠째 이어졌는지 보여줍니다. 길수록 피로도와 전환 가능성을 함께 봐야 합니다." />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{duration}d</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <AlertTriangle className="size-4" />
              <TermHint label="위험 수준" description="쏠림도, 취약도, 위험 대비 보상을 종합한 현재 시장의 흔들림 위험입니다." />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{riskLabel(risk)}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="쏠림도"
              value={regime.crowdedness}
              inverse
              help="주도 테마에 가격과 관심이 얼마나 몰려 있는지 봅니다. 높을수록 추격 부담이 큽니다."
              direction="높을수록 나쁨: 과열·추격 부담"
            />
            <Metric
              label="위험 대비 보상"
              value={regime.riskReward}
              help="현재 가격에서 남은 상승 여지와 하락 위험의 균형입니다. 높을수록 관찰 자리가 낫습니다."
              direction="높을수록 좋음: 보상 여지 우위"
            />
            <Metric
              label="자금 이동 가능성"
              value={regime.rotationProbability}
              help="다음 섹터나 테마로 자금이 옮겨갈 가능성입니다."
              direction="높을수록 전환 신호 강함"
            />
            <Metric
              label="취약도"
              value={regime.fragilityScore}
              inverse
              help="작은 충격에 시장이 흔들릴 가능성입니다. 높을수록 무효화 조건이 중요합니다."
              direction="높을수록 나쁨: 변동성·훼손 위험"
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Layers3 className="size-4" />
                <TermHint label="참여 폭" description="상승이 일부 종목에만 집중되는지, 여러 섹터로 넓게 퍼지는지 보는 지표입니다." />
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{regime.breadth}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Shield className="size-4" />
                <TermHint label="포지션 상태" description="시장 참여자들의 관심과 포지션이 어느 쪽으로 기울어 있는지에 대한 해석입니다." />
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{regime.positioning}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
