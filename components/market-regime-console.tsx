import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, Gauge, GitCompareArrows, Shield } from "lucide-react";

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

function metricDelta(current?: number, previous?: number) {
  if (typeof current !== "number" || typeof previous !== "number") return null;
  return Math.round(current - previous);
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
    if (!current || (entry.lastUpdated ?? "") > (current.lastUpdated ?? "")) byDate.set(entry.date, entry);
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

function scoreTone(value: number, inverse = false) {
  const good = inverse ? value <= 40 : value >= 70;
  const bad = inverse ? value >= 70 : value <= 40;
  if (good) return "bg-emerald-600";
  if (bad) return "bg-rose-600";
  return "bg-amber-500";
}

function Delta({ value, inverse }: { value: number | null; inverse?: boolean }) {
  if (value === null || value === 0) return <Badge variant="neutral">변화 없음</Badge>;
  const worse = inverse ? value > 0 : value < 0;
  return (
    <Badge variant={worse ? "caution" : "positive"}>
      {value > 0 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
      {value > 0 ? `+${value}` : value}
    </Badge>
  );
}

function Metric({
  label,
  value,
  previous,
  inverse,
  help,
}: {
  label: string;
  value?: number;
  previous?: number;
  inverse?: boolean;
  help: string;
}) {
  const score = clampScore(value);
  const delta = metricDelta(value, previous);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" title={help}>
      <div className="flex items-center justify-between gap-3">
        <TermHint label={label} description={help} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500" />
        <Delta value={delta} inverse={inverse} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold text-slate-950">{score}</p>
        <p className="text-xs text-slate-500">이전 {typeof previous === "number" ? Math.round(previous) : "-"}</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${scoreTone(score, inverse)}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function splitLabel(value: string) {
  return value.includes("|") ? value.split("|").map((part) => part.trim()).filter(Boolean).at(-1) ?? value : value;
}

function interpretation(current: MarketRegimeAssessment, previous?: MarketRegimeAssessment) {
  if (!previous) return "이 리포트를 새 기준점으로 저장합니다.";

  const crowdedness = metricDelta(current.crowdedness, previous.crowdedness) ?? 0;
  const riskReward = metricDelta(current.riskReward, previous.riskReward) ?? 0;
  const fragility = metricDelta(current.fragilityScore, previous.fragilityScore) ?? 0;
  const rotation = metricDelta(current.rotationProbability, previous.rotationProbability) ?? 0;

  if (crowdedness >= 8 && riskReward <= -5) return "쏠림은 커졌고 보상은 약해져 추격보다 다음 순환 확인이 우선입니다.";
  if (fragility >= 8) return "취약성이 올라가 강한 테마 안에서도 무효화 조건을 더 엄격히 봐야 합니다.";
  if (rotation >= 8) return "자금 순환 압력이 강해져 기존 리더보다 다음 후보군의 상대강도를 우선 확인합니다.";
  if (riskReward >= 5 && fragility <= 0) return "위험 대비 보상이 개선되어 확인된 촉매의 후속 확산을 볼 수 있습니다.";
  if (current.stage !== previous.stage) return "시장 단계가 바뀌어 기존 섹터 판단을 현재 breadth와 positioning으로 다시 확인합니다.";
  return "큰 국면은 유지되지만 세부 점수가 바뀌어 순환 후보와 과열 리스크를 함께 재점검합니다.";
}

export function MarketRegimeConsole({
  latest,
  history = [],
  previousDay,
}: {
  latest: DailyAnalysis;
  history?: DailyAnalysis[];
  previousDay?: DailyAnalysis | null;
}) {
  const regime = latest.marketRegime;
  const previous = previousDay?.marketRegime;
  if (!regime) return null;

  const confidence = buildRegimeConfidence(latest);
  const duration = regimeDurationDays(latest, history);
  const risk = riskLevel(regime);
  const topRotation = splitLabel(regime.nextRotation?.[0] ?? latest.topOpportunity);

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <Gauge className="size-4" />
            Regime & Change
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {stageLabel(regime.stage)} 시장 국면 · {riskLabel(risk)}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{regime.summary}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Shield className="size-4" />
                판단 신뢰도
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{confidence.score}%</p>
              <p className="mt-1 text-xs text-slate-500">{confidence.label}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <CalendarDays className="size-4" />
                지속 기간
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{duration}d</p>
              <p className="mt-1 text-xs text-slate-500">같은 단계 유지</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <GitCompareArrows className="size-4" />
                변화 해석
              </div>
              <p className="mt-2 line-clamp-3 text-sm font-semibold leading-5 text-slate-950">{interpretation(regime, previous)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="쏠림도"
              value={regime.crowdedness}
              previous={previous?.crowdedness}
              inverse
              help="주도 테마에 가격과 관심이 얼마나 몰려 있는지 봅니다. 높을수록 추격 부담이 큽니다."
            />
            <Metric
              label="위험 대비 보상"
              value={regime.riskReward}
              previous={previous?.riskReward}
              help="현재 가격에서 남은 상승 여지와 하락 위험의 균형입니다. 높을수록 관찰 자리가 낫습니다."
            />
            <Metric
              label="자금 이동 가능성"
              value={regime.rotationProbability}
              previous={previous?.rotationProbability}
              help="다음 섹터나 테마로 자금이 옮겨갈 가능성입니다."
            />
            <Metric
              label="취약도"
              value={regime.fragilityScore}
              previous={previous?.fragilityScore}
              inverse
              help="작은 충격에 시장이 흔들릴 가능성입니다. 높을수록 무효화 조건이 중요합니다."
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">기준 리포트</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{previousDay?.date ?? "이전 없음"}</Badge>
                <ArrowRight className="size-4 text-slate-400" />
                <Badge variant="positive">{latest.date}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">다음 순환 후보</p>
              <p className="mt-2 text-sm font-semibold leading-5 text-slate-950">{topRotation}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
