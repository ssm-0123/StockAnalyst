import { ArrowUpRight, BadgeCheck, Scale, ShieldAlert } from "lucide-react";

import type { DashboardActionCandidate } from "@/components/action-command-panel";
import { Badge } from "@/components/ui/badge";
import { getMarketBadgeVariant, getMarketLabel } from "@/lib/market";
import { actionBiasLabel } from "@/lib/public-display";

function formatPrice(value?: number, market?: DashboardActionCandidate["market"], currency?: "KRW" | "USD") {
  if (typeof value !== "number") return "가격 확인 중";
  return new Intl.NumberFormat(market === "KR" ? "ko-KR" : "en-US", {
    style: "currency",
    currency: currency ?? (market === "KR" ? "KRW" : "USD"),
    maximumFractionDigits: market === "KR" ? 0 : 2,
  }).format(value);
}

function confidenceLabel(value?: DashboardActionCandidate["confidenceLevel"]) {
  if (value === "high") return "높음";
  if (value === "low") return "낮음";
  return "보통";
}

function entryQualityLabel(value?: DashboardActionCandidate["entryQuality"]) {
  if (value === "actionable") return "진입 품질 양호";
  if (value === "avoid-chase") return "추격 금지";
  if (value === "wait-for-pullback") return "눌림 대기";
  return "가격 확인 필요";
}

function entryQualityVariant(value?: DashboardActionCandidate["entryQuality"]) {
  if (value === "actionable") return "positive";
  if (value === "avoid-chase") return "caution";
  return "neutral";
}

function pickCatalyst(candidate: DashboardActionCandidate) {
  return candidate.catalysts?.[0] ?? candidate.keyDrivers?.[0] ?? candidate.watchCondition ?? candidate.positioningNote ?? candidate.rationale;
}

function pickRisk(candidate: DashboardActionCandidate) {
  return candidate.risks?.[0] ?? "가격 추격, 촉매 지연, 시장 국면 변화가 핵심 리스크입니다.";
}

function pickEdge(candidate: DashboardActionCandidate) {
  return (
    candidate.positioningNote ??
    candidate.confidenceReason ??
    candidate.watchCondition ??
    "섹터 호재 자체보다 가격 위치와 후속 확인 조건을 기준으로 검토합니다."
  );
}

function pricedInText(candidate: DashboardActionCandidate) {
  if (candidate.alreadyPriced) return candidate.alreadyPriced;
  if (candidate.entryQuality === "avoid-chase") return "추격 부담 큼";
  if (candidate.entryQuality === "wait-for-pullback") return "일부 반영, 눌림 확인 필요";
  if (candidate.entryQuality === "actionable") return "아직 과도한 추격 신호는 아님";
  return "가격 반영도 확인 중";
}

function OpportunityCard({ candidate }: { candidate: DashboardActionCandidate }) {
  const snapshot = candidate.priceSnapshot;

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={getMarketBadgeVariant(candidate.market)}>{getMarketLabel(candidate.market)}</Badge>
            <Badge variant={entryQualityVariant(candidate.entryQuality)}>{entryQualityLabel(candidate.entryQuality)}</Badge>
          </div>
          <h3 className="mt-3 break-words text-lg font-semibold leading-6 tracking-tight text-slate-950">{candidate.companyName}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{candidate.ticker}</p>
        </div>
        <Badge variant="positive">{actionBiasLabel(candidate.actionBias)}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-900">{formatPrice(snapshot?.currentPrice, candidate.market, snapshot?.currency)}</span>
        <span>·</span>
        <span className="break-words">{candidate.sector}</span>
      </div>

      <div className="mt-4 grid flex-1 gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Thesis</p>
          <p className="mt-1 break-words text-sm leading-6 text-slate-700">
            {candidate.stockThesis ?? candidate.thesis ?? candidate.rationale}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Catalyst</p>
          <p className="mt-1 break-words text-sm leading-6 text-slate-700">{pickCatalyst(candidate)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="rounded-lg border border-white bg-white p-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Scale className="size-4 text-slate-700" />
            Edge
          </div>
          <p className="mt-1 break-words text-xs leading-5 text-slate-600">{pickEdge(candidate)}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Priced-in / Consensus Risk</p>
          <p className="mt-1 break-words text-xs leading-5 text-slate-600">{pricedInText(candidate)}</p>
        </div>
        <div className="rounded-lg border border-white bg-white p-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <BadgeCheck className="size-4 text-emerald-700" />
            Confidence
          </div>
          <p className="mt-1 break-words text-xs leading-5 text-slate-500">
            {confidenceLabel(candidate.confidenceLevel)} · {candidate.confidenceReason ?? "가격 스냅샷 기준 확인 중"}
          </p>
        </div>
        <div className="rounded-lg border border-rose-100 bg-rose-50/70 p-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
            <ShieldAlert className="size-4" />
            Risk
          </div>
          <p className="mt-1 break-words text-xs leading-5 text-slate-600">{candidate.invalidation ?? pickRisk(candidate)}</p>
        </div>
      </div>

      <details className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          전체 리서치 메모
        </summary>
        <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
          <p>{candidate.rationale}</p>
          {candidate.positioningNote ? <p><span className="font-semibold text-slate-950">포지션: </span>{candidate.positioningNote}</p> : null}
          <p><span className="font-semibold text-slate-950">가격 반영도: </span>{pricedInText(candidate)}</p>
          {candidate.valuationNote ? <p><span className="font-semibold text-slate-950">밸류에이션: </span>{candidate.valuationNote}</p> : null}
          {candidate.liquidityNote ? <p><span className="font-semibold text-slate-950">유동성: </span>{candidate.liquidityNote}</p> : null}
          <p><span className="font-semibold text-slate-950">리스크: </span>{pickRisk(candidate)}</p>
        </div>
      </details>
    </article>
  );
}

export function ResearchOpportunities({ candidates }: { candidates: DashboardActionCandidate[] }) {
  const items = candidates.slice(0, 6);
  const visibleItems = items.slice(0, 3);
  const hiddenItems = items.slice(3);

  if (!items.length) return null;

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <ArrowUpRight className="size-4" />
            Research Opportunities
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">관심 후보는 짧은 리서치 브리프로 봅니다.</h2>
        </div>
        <Badge variant="positive">{visibleItems.length}/{items.length} 후보</Badge>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="grid gap-3 xl:grid-cols-3">
          {visibleItems.map((candidate) => <OpportunityCard key={candidate.key} candidate={candidate} />)}
        </div>
      </div>

      {hiddenItems.length ? (
        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">리서치 후보 {hiddenItems.length}개 더 보기</summary>
          <div className="mt-3 grid gap-3 xl:grid-cols-3">
            {hiddenItems.map((candidate) => <OpportunityCard key={candidate.key} candidate={candidate} />)}
          </div>
        </details>
      ) : null}
    </section>
  );
}
