import { ArrowUpRight, BadgeCheck, LineChart, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getMarketBadgeVariant, getMarketLabel } from "@/lib/market";
import { actionBiasLabel } from "@/lib/public-display";
import type { DashboardActionCandidate } from "@/components/action-command-panel";

function formatPrice(value?: number, market?: DashboardActionCandidate["market"], currency?: "KRW" | "USD") {
  if (typeof value !== "number") return "업데이트 예정";
  return new Intl.NumberFormat(market === "KR" ? "ko-KR" : "en-US", {
    style: "currency",
    currency: currency ?? (market === "KR" ? "KRW" : "USD"),
    maximumFractionDigits: market === "KR" ? 0 : 2,
  }).format(value);
}

function formatRelativeToHigh(current?: number, high?: number) {
  if (typeof current !== "number" || typeof high !== "number" || high <= 0) return "고점 정보 대기";
  return `${((current / high - 1) * 100).toFixed(1)}%`;
}

function confidenceLabel(value?: DashboardActionCandidate["confidenceLevel"]) {
  if (value === "high") return "High";
  if (value === "low") return "Low";
  return "Medium";
}

function timeHorizonLabel(value?: DashboardActionCandidate["timeHorizon"]) {
  if (value === "1-3d") return "1-3일";
  if (value === "1-3m") return "1-3개월";
  return "1-3주";
}

function pickCatalyst(candidate: DashboardActionCandidate) {
  return candidate.catalysts?.[0] ?? candidate.keyDrivers?.[0] ?? candidate.watchCondition ?? candidate.positioningNote ?? candidate.rationale;
}

function pickRisk(candidate: DashboardActionCandidate) {
  return candidate.risks?.[0] ?? "가격 추격, 촉매 지연, 시장 국면 변화가 핵심 리스크입니다.";
}

export function ResearchOpportunities({ candidates }: { candidates: DashboardActionCandidate[] }) {
  const items = candidates.slice(0, 6);

  if (!items.length) {
    return null;
  }

  return (
    <section className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            <LineChart className="size-4" />
            Research Opportunities
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">관심 후보를 리서치 카드로 봅니다.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            단순 티커 목록이 아니라 thesis, catalyst, 가격 위치, 무효화 조건을 함께 봅니다.
          </p>
        </div>
        <Badge variant="positive">{items.length} ideas</Badge>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {items.map((candidate) => {
          const snapshot = candidate.priceSnapshot;
          return (
            <article key={candidate.key} className="flex h-full flex-col rounded-2xl border border-emerald-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getMarketBadgeVariant(candidate.market)}>{getMarketLabel(candidate.market)}</Badge>
                    <Badge variant="positive">{actionBiasLabel(candidate.actionBias)}</Badge>
                    <Badge variant="neutral">{timeHorizonLabel(candidate.timeHorizon)}</Badge>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{candidate.companyName}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{candidate.ticker} · {candidate.sector}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <ArrowUpRight className="size-5" />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Thesis</p>
                <p className="mt-1 line-clamp-4 text-sm leading-6 text-slate-700">
                  {candidate.stockThesis ?? candidate.thesis ?? candidate.rationale}
                </p>
              </div>

              <div className="mt-3 grid gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Catalyst</p>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-700">{pickCatalyst(candidate)}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price Position</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {formatPrice(snapshot?.currentPrice, candidate.market, snapshot?.currency)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">52주 고점 대비 {formatRelativeToHigh(snapshot?.currentPrice, snapshot?.week52High)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Already Priced?</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{candidate.alreadyPriced ?? "가격 반영도 확인 중"}</p>
                    <p className="mt-1 text-xs text-slate-500">{candidate.watchDate ?? candidate.watchCondition ?? "다음 A1에서 재확인"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Confidence</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <BadgeCheck className="size-4 text-emerald-700" />
                      {confidenceLabel(candidate.confidenceLevel)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {candidate.confidenceReason ?? `${candidate.snapshotHealth ?? "snapshot"} data`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid flex-1 gap-3">
                <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                    <ShieldAlert className="size-4" />
                    Risk
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-700">{pickRisk(candidate)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Invalidation</p>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-700">
                    {candidate.invalidation ?? "핵심 논리를 깨는 가격, 수급, 실적 변화가 나오면 재평가합니다."}
                  </p>
                </div>
              </div>
              <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Full Research Note
                </summary>
                <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                  <p>{candidate.rationale}</p>
                  {candidate.positioningNote ? <p><span className="font-semibold text-slate-950">Positioning: </span>{candidate.positioningNote}</p> : null}
                  {candidate.valuationNote ? <p><span className="font-semibold text-slate-950">Valuation: </span>{candidate.valuationNote}</p> : null}
                  {candidate.liquidityNote ? <p><span className="font-semibold text-slate-950">Liquidity: </span>{candidate.liquidityNote}</p> : null}
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
