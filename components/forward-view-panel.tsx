import { ArrowRight, Compass, Gauge, MoveRight } from "lucide-react";

import type { DashboardActionCandidate } from "@/components/action-command-panel";
import { TermHint } from "@/components/term-hint";
import { Badge } from "@/components/ui/badge";
import { buildForwardConfidence } from "@/lib/research-confidence";
import { withBasePath } from "@/lib/site";
import type { DailyAnalysis } from "@/lib/types";

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

function viewBuckets(latest: DailyAnalysis) {
  const rotations = unique(latest.marketRegime?.nextRotation ?? []);
  const promising = unique(latest.promisingSectors.map((sector) => sector.sectorName));
  const favor = unique([...rotations, ...promising]).slice(0, 3);
  const neutral = unique(
    latest.themeRadar
      ?.filter((theme) => theme.tradability === "wait_for_confirmation" || theme.tradability === "watch_after_spike")
      .map((theme) => theme.theme) ?? [],
  ).slice(0, 2);
  const avoid = unique([
    ...latest.cautionSectors.map((sector) => sector.sectorName),
    ...(latest.themeRadar
      ?.filter((theme) => theme.tradability === "avoid_chase")
      .map((theme) => theme.theme) ?? []),
  ]).slice(0, 3);

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

function primaryTicker(candidate?: DashboardActionCandidate) {
  if (!candidate) return "후보 확인 중";
  return `${candidate.ticker} · ${candidate.companyName}`;
}

function BriefBucket({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "positive" | "neutral" | "caution";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.length ? (
          items.map((item) => (
            <Badge key={`${title}-${item}`} variant={variant} className="border-white/10 px-2 py-0.5 text-[11px]">
              {item}
            </Badge>
          ))
        ) : (
          <Badge variant="neutral" className="border-white/10 bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">
            No clear signal
          </Badge>
        )}
      </div>
    </div>
  );
}

export function ForwardViewPanel({
  latest,
  buyCandidates = [],
  riskCandidates = [],
}: {
  latest: DailyAnalysis;
  buyCandidates?: DashboardActionCandidate[];
  riskCandidates?: DashboardActionCandidate[];
}) {
  const buckets = viewBuckets(latest);
  const confidence = buildForwardConfidence(latest);
  const reasons = rationale(latest);
  const flows = moneyFlows(latest);
  const focus = buyCandidates[0];
  const risk = riskCandidates[0];
  const monitorTheme =
    latest.themeRadar?.find((theme) => theme.tradability === "wait_for_confirmation") ?? latest.themeRadar?.[0];

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white shadow-panel sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="positive">Next 1-2 Weeks</Badge>
          <Badge variant="neutral" className="border-white/10 bg-white/10 text-slate-200">
            AI Market Brief
          </Badge>
          <Badge variant="neutral" className="border-white/10 bg-white/10 text-slate-200">
            {latest.date}
          </Badge>
        </div>
        <a
          href={withBasePath("/Results")}
          className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/15"
        >
          판단 결과
        </a>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">다음 자금 이동은 어디로 향하는가</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            현재 국면, 변화, 테마 반응을 하나의 단기 리서치 관점으로 압축합니다.
          </p>

          <div className="mt-5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">핵심 결론</p>
            <p className="mt-2 text-lg font-semibold leading-7 text-white">{latest.topOpportunity}</p>
            <p className="mt-1 text-sm leading-6 text-slate-200">핵심 리스크: {latest.topRisk}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Focus</p>
              <p className="mt-2 text-sm font-semibold leading-5 text-white">{primaryTicker(focus)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Watch</p>
              <p className="mt-2 text-sm font-semibold leading-5 text-white">{monitorTheme?.theme ?? "확인 대기"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Avoid</p>
              <p className="mt-2 text-sm font-semibold leading-5 text-white">{risk ? primaryTicker(risk) : buckets.avoid[0]}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-3">
            <BriefBucket title="Favor" items={buckets.favor} variant="positive" />
            <BriefBucket title="Watch" items={buckets.neutral} variant="neutral" />
            <BriefBucket title="Avoid" items={buckets.avoid} variant="caution" />
          </div>

          <div className="grid gap-3 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <Gauge className="size-4" />
                  <TermHint
                    label="판단 신뢰도"
                    description="근거의 신선도, 국면 점수, 테마 강도를 종합한 리서치 확신도입니다. 맞을 확률이나 매수 지시는 아닙니다."
                    tooltipClassName="border-white/10 bg-slate-900 text-slate-100"
                  />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold text-white">{confidence.score}%</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-200">{confidence.label}</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${confidence.score}%` }} />
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-300">
                + {confidence.positives.join(" · ") || "강한 가산 요인 없음"}
                {confidence.negatives.length ? ` / - ${confidence.negatives.join(" · ")}` : ""}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <Compass className="size-4" />
                핵심 근거
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
          </div>

          {flows.length ? (
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <MoveRight className="size-4" />
                자금 이동 가설
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
