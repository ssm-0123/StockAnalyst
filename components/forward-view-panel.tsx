import { ArrowRight, Compass, Gauge, MoveRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { withBasePath } from "@/lib/site";
import type { DailyAnalysis } from "@/lib/types";

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function splitLabel(value: string) {
  return value.includes("|") ? value.split("|").map((part) => part.trim()).filter(Boolean).at(-1) ?? value : value;
}

function compactLabel(value: string) {
  const label = splitLabel(value).replace(/^(KR|US)\s+/, "").trim();
  const rules: Array<[RegExp, string]> = [
    [/조선\/방산|KDDX|캐나다 방산/, "KDDX/방산"],
    [/후공정|검사장비/, "후공정 검사장비"],
    [/전력 인프라|전력 품질|전력 장비|데이터센터 capex/i, "AI 전력 인프라"],
    [/AI 반도체|반도체\/네트워킹|HBM 대형주|반도체 ETF/i, "AI/HBM 리더"],
    [/고베타 원전|데이터센터 옵션/i, "고베타 원전/데이터센터"],
    [/현금성 대기|충격 후 현금성/, "현금성 대기"],
    [/SaaS|데이터 구독/i, "SaaS/데이터 구독"],
    [/항공|온라인 여행/, "항공/여행"],
    [/Jensen Huang|physical AI/i, "Physical AI 협력"],
    [/미국 고용|AI 리더 재가격/, "AI 리더 재가격"],
  ];
  const matched = rules.find(([pattern]) => pattern.test(label));
  if (matched) return matched[1];
  return label.length > 18 ? `${label.slice(0, 18).trim()}...` : label;
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => compactLabel(item).trim()).filter(Boolean)));
}

function sentence(value?: string) {
  return value?.split(/(?<=[.!?。]|[다요]\.)\s+/).find(Boolean)?.trim() ?? "";
}

function forwardConfidence(latest: DailyAnalysis) {
  const regime = latest.marketRegime;
  const topSector = latest.promisingSectors[0];
  const topTheme = latest.themeRadar?.[0];
  if (!regime) return topSector?.confidenceScore ?? topTheme?.signalStrength ?? 0;

  const base =
    regime.rotationProbability * 0.36 +
    regime.riskReward * 0.22 +
    (topSector?.confidenceScore ?? regime.rotationProbability) * 0.24 +
    (topTheme?.signalStrength ?? regime.rotationProbability) * 0.18;
  const fragilityPenalty = Math.max(0, regime.fragilityScore - 70) * 0.12;
  const crowdedPenalty = Math.max(0, regime.crowdedness - 80) * 0.08;
  return clampScore(base - fragilityPenalty - crowdedPenalty);
}

function viewBuckets(latest: DailyAnalysis) {
  const rotations = unique(latest.marketRegime?.nextRotation ?? []);
  const promising = unique(latest.promisingSectors.map((sector) => sector.sectorName));
  const favor = unique([...rotations, ...promising]).slice(0, 4);
  const neutral = unique(
    latest.themeRadar
      ?.filter((theme) => theme.tradability === "wait_for_confirmation" || theme.tradability === "watch_after_spike")
      .map((theme) => theme.theme) ?? [],
  ).slice(0, 3);
  const avoid = unique([
    ...latest.cautionSectors.map((sector) => sector.sectorName),
    ...(latest.themeRadar
      ?.filter((theme) => theme.tradability === "avoid_chase")
      .map((theme) => theme.theme) ?? []),
  ]).slice(0, 4);

  return {
    favor,
    neutral: neutral.length ? neutral : ["확인 대기 테마"],
    avoid,
  };
}

function rationale(latest: DailyAnalysis) {
  const regime = latest.marketRegime;
  const topSector = latest.promisingSectors[0];
  const topTheme = latest.themeRadar?.[0];
  return [
    sentence(regime?.summary),
    sentence(topSector?.thesis),
    sentence(topTheme?.marketReaction || topTheme?.narrative),
  ]
    .filter(Boolean)
    .slice(0, 3);
}

function moneyFlows(latest: DailyAnalysis) {
  const caution = unique(latest.cautionSectors.map((sector) => sector.sectorName));
  const rotations = unique(latest.marketRegime?.nextRotation ?? []);
  const current = unique(latest.promisingSectors.map((sector) => sector.sectorName));
  const flows = [
    [caution[0], rotations[0]],
    [current[0], rotations[1] ?? rotations[0]],
    [caution[1], rotations[2] ?? current[1]],
  ].filter(([from, to]) => from && to && from !== to);

  return flows.slice(0, 3);
}

function actionSummary(latest: DailyAnalysis) {
  const buckets = viewBuckets(latest);
  const favor = buckets.favor.slice(0, 2).join(", ") || "clearer rotation candidates";
  const neutral = buckets.neutral[0] ?? "confirmation-only themes";
  const avoid = buckets.avoid.slice(0, 2).join(", ") || "crowded trades";
  return `우선 관찰: ${favor}. ${neutral}은 확인 대기, ${avoid}는 회복 조건 전 추격 금지.`;
}

function Bucket({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "positive" | "neutral" | "caution";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <Badge key={`${title}-${item}`} variant={variant} className="border-white/10">
              {item}
            </Badge>
          ))
        ) : (
          <Badge variant="neutral" className="border-white/10 bg-white/10 text-slate-200">
            No clear signal
          </Badge>
        )}
      </div>
    </div>
  );
}

export function ForwardViewPanel({ latest }: { latest: DailyAnalysis }) {
  const buckets = viewBuckets(latest);
  const confidence = forwardConfidence(latest);
  const reasons = rationale(latest);
  const flows = moneyFlows(latest);
  const summary = actionSummary(latest);

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white shadow-panel sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="positive">Forward View</Badge>
              <Badge variant="neutral" className="border-white/10 bg-white/10 text-slate-200">
                Next 1-2 Weeks
              </Badge>
            </div>
            <a
              href={withBasePath("/Results")}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/15"
            >
              Track Record
            </a>
          </div>
          <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            다음 자금 이동은 어디로 향하는가
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
            뉴스 요약이 아니라 현재 국면, 변화, 테마 반응을 묶어 다음 1-2주 리서치 우선순위를 제시합니다.
          </p>

          <div className="mt-5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Action Summary</p>
            <p className="mt-2 text-base font-semibold leading-7 text-white">{summary}</p>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <Gauge className="size-4" />
                Confidence
              </div>
              <p className="text-3xl font-semibold text-white">{confidence}%</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${confidence}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-300">
              리서치 근거의 강도입니다. 맞을 확률이나 매수 신호가 아닙니다.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-3">
            <Bucket title="Favor" items={buckets.favor} variant="positive" />
            <Bucket title="Neutral" items={buckets.neutral} variant="neutral" />
            <Bucket title="Avoid" items={buckets.avoid} variant="caution" />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <Compass className="size-4" />
              Rationale
            </div>
            <div className="mt-3 grid gap-2">
              {reasons.map((item, index) => (
                <div key={`forward-rationale-${index}`} className="flex gap-2 text-sm leading-6 text-slate-100">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-300" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {flows.length ? (
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <MoveRight className="size-4" />
                Money Flow
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {flows.map(([from, to]) => (
                  <div key={`${from}-${to}`} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-900">
                    <span>{from}</span>
                    <ArrowRight className="size-4 text-slate-400" />
                    <span>{to}</span>
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
