import { AlertTriangle, CheckCircle2, Clock, Shield, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getMarketBadgeVariant, getMarketLabel } from "@/lib/market";
import type { ActionBias, DailyAnalysis, SmallCapIdea, StockIdea, StockPriceSnapshot } from "@/lib/types";

export type DashboardActionCandidate = {
  key: string;
  ticker: string;
  companyName: string;
  market: StockIdea["market"] | SmallCapIdea["market"];
  sector: string;
  actionBias: ActionBias;
  timeHorizon?: StockIdea["timeHorizon"] | SmallCapIdea["timeHorizon"];
  rationale: string;
  positioningNote?: string;
  invalidation?: string;
  priceSnapshot?: StockPriceSnapshot;
  snapshotHealth?: StockIdea["snapshotHealth"] | SmallCapIdea["snapshotHealth"];
};

function actionBiasLabel(actionBias: ActionBias) {
  if (actionBias === "buy") return "관심확대";
  if (actionBias === "hold") return "관찰";
  if (actionBias === "reduce") return "주의축소";
  return "제외";
}

function actionBiasVariant(actionBias: ActionBias) {
  if (actionBias === "buy") return "positive" as const;
  if (actionBias === "hold") return "neutral" as const;
  return "caution" as const;
}

function timeHorizonLabel(value?: StockIdea["timeHorizon"] | SmallCapIdea["timeHorizon"]) {
  if (value === "1-3d") return "1-3일";
  if (value === "1-3m") return "1-3개월";
  return "1-3주";
}

function formatPrice(value?: number, market?: StockIdea["market"] | SmallCapIdea["market"], currency?: "KRW" | "USD") {
  if (typeof value !== "number") {
    return "업데이트 예정";
  }

  return new Intl.NumberFormat(market === "KR" ? "ko-KR" : "en-US", {
    style: "currency",
    currency: currency ?? (market === "KR" ? "KRW" : "USD"),
    maximumFractionDigits: market === "KR" ? 0 : 2,
  }).format(value);
}

function formatPercent(value?: number) {
  if (typeof value !== "number") {
    return "업데이트 예정";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatRelativeToHigh(current?: number, high?: number) {
  if (typeof current !== "number" || typeof high !== "number" || high <= 0) {
    return "업데이트 예정";
  }

  return `${((current / high - 1) * 100).toFixed(1)}%`;
}

function stageLabel(stage?: "early" | "mid" | "late") {
  if (stage === "early") return "초기";
  if (stage === "late") return "후기";
  return "중기";
}

function ActionList({
  title,
  countLabel,
  candidates,
  emptyText,
  tone,
}: {
  title: string;
  countLabel: string;
  candidates: DashboardActionCandidate[];
  emptyText: string;
  tone: "positive" | "caution";
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {tone === "positive" ? (
            <Target className="size-4 text-emerald-700" />
          ) : (
            <AlertTriangle className="size-4 text-rose-700" />
          )}
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        </div>
        <Badge variant={tone}>{countLabel}</Badge>
      </div>

      {candidates.length ? (
        <div className="mt-3 divide-y divide-slate-100">
          {candidates.map((candidate) => {
            const snapshot = candidate.priceSnapshot;
            return (
              <details key={candidate.key} className="group py-3">
                <summary className="grid cursor-pointer list-none gap-3 rounded-xl px-2 py-1 hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={actionBiasVariant(candidate.actionBias)}>{actionBiasLabel(candidate.actionBias)}</Badge>
                      <Badge variant={getMarketBadgeVariant(candidate.market)}>{getMarketLabel(candidate.market)}</Badge>
                      {candidate.snapshotHealth ? <Badge variant="neutral">{candidate.snapshotHealth}</Badge> : null}
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-slate-950">
                      {candidate.ticker} · {candidate.companyName}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">{candidate.sector}</p>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatPrice(snapshot?.currentPrice, candidate.market, snapshot?.currency)}
                  </div>
                  <div className="text-sm text-slate-600">
                    {formatPercent(snapshot?.previousCloseChangePct)}
                  </div>
                </summary>
                <div className="mt-2 grid gap-3 rounded-2xl bg-slate-50/80 p-3 text-sm leading-6 text-slate-700 md:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <p>{candidate.rationale}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      무효화: {candidate.invalidation ?? "가격, 수급, 실적 논리가 깨지면 재평가"}
                    </p>
                  </div>
                  <div className="grid gap-2 text-xs">
                    <div className="rounded-xl bg-white px-3 py-2">
                      <span className="text-slate-500">기간 </span>
                      <span className="font-semibold text-slate-900">{timeHorizonLabel(candidate.timeHorizon)}</span>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <span className="text-slate-500">52주 고점 대비 </span>
                      <span className="font-semibold text-slate-900">
                        {formatRelativeToHigh(snapshot?.currentPrice, snapshot?.week52High)}
                      </span>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <span className="text-slate-500">관찰 메모 </span>
                      <span className="font-semibold text-slate-900">
                        {candidate.positioningNote ?? "상세 조건 확인"}
                      </span>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
          {emptyText}
        </div>
      )}
    </div>
  );
}

export function ActionCommandPanel({
  latest,
  buyCandidates,
  riskCandidates,
}: {
  latest: DailyAnalysis;
  buyCandidates: DashboardActionCandidate[];
  riskCandidates: DashboardActionCandidate[];
}) {
  const validation = latest.validationSummary;
  const regime = latest.marketRegime;
  const freshText = validation ? `${validation.freshSnapshots}/${validation.totalIdeas}` : "확인 전";

  return (
    <section className="mt-8 rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <CheckCircle2 className="size-4" />
            오늘의 분석판
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            핵심 분석 신호를 먼저 보고, 상세 논리는 펼쳐서 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="positive">Buy {buyCandidates.length}</Badge>
          <Badge variant="caution">Risk {riskCandidates.length}</Badge>
          <Badge variant="neutral">Fresh {freshText}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">최상위 기회</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{latest.topOpportunity}</p>
        </div>
        <div className="rounded-2xl bg-rose-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">최상위 리스크</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{latest.topRisk}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">시장 국면</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
            {stageLabel(regime?.stage)} · crowd {regime?.crowdedness ?? "-"} · rotation {regime?.rotationProbability ?? "-"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">업데이트</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold leading-6 text-slate-950">
            <Clock className="size-4 text-slate-500" />
            {latest.date}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <ActionList
          title="관심 확대 후보"
          countLabel={`${buyCandidates.length}개`}
          candidates={buyCandidates}
          emptyText="이번 결과에는 즉시 관심 확대 후보가 없습니다."
          tone="positive"
        />
        <ActionList
          title="주의/축소 신호"
          countLabel={`${riskCandidates.length}개`}
          candidates={riskCandidates}
          emptyText="이번 결과에는 명시적인 주의/축소 신호가 없습니다."
          tone="caution"
        />
      </div>

      {regime ? (
        <details className="group mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
            <span className="inline-flex items-center gap-2">
              <Shield className="size-4 text-slate-500" />
              시장 국면 상세
            </span>
            <span className="text-xs text-slate-500">펼치기</span>
          </summary>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-700 lg:grid-cols-2">
            <p>{regime.regime}</p>
            <p>{regime.summary}</p>
            <p>
              <span className="font-semibold text-slate-950">breadth: </span>
              {regime.breadth}
            </p>
            <p>
              <span className="font-semibold text-slate-950">positioning: </span>
              {regime.positioning}
            </p>
          </div>
        </details>
      ) : null}
    </section>
  );
}
