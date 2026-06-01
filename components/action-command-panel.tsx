import { AlertTriangle, Clock, Eye, Focus, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { getMarketBadgeVariant, getMarketLabel } from "@/lib/market";
import { actionBiasLabel } from "@/lib/public-display";
import type { ActionBias, ConfidenceLevel, DailyAnalysis, SmallCapIdea, StockIdea, StockPriceSnapshot } from "@/lib/types";

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
  confidenceLevel?: ConfidenceLevel;
  thesis?: string;
  keyDrivers?: string[];
  catalysts?: string[];
  risks?: string[];
  valuationNote?: string;
  liquidityNote?: string;
};

function stageLabel(stage?: "early" | "mid" | "late") {
  if (stage === "early") return "초기";
  if (stage === "late") return "후기";
  return "중기";
}

function primaryTicker(candidate?: DashboardActionCandidate) {
  if (!candidate) return "확인 대기";
  return `${candidate.ticker} · ${candidate.companyName}`;
}

function WatchCard({
  label,
  title,
  detail,
  tone,
  icon,
}: {
  label: string;
  title: string;
  detail: string;
  tone: "positive" | "caution" | "neutral";
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {icon}
          {label}
        </div>
        <Badge variant={tone}>{tone === "positive" ? "Focus" : tone === "caution" ? "Risk" : "Monitor"}</Badge>
      </div>
      <p className="mt-3 text-base font-semibold leading-6 text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
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
  const topFocus = buyCandidates[0];
  const topRisk = riskCandidates[0];
  const monitorTheme = latest.themeRadar?.find((theme) => theme.tradability === "wait_for_confirmation") ?? latest.themeRadar?.[0];

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <Eye className="size-4" />
            What To Watch Now
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            지금 볼 것, 기다릴 것, 피할 것을 분리합니다.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            아래 종목 추천표가 아니라 현재 시장 국면에서 우선 확인해야 할 리서치 체크리스트입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="positive">Focus {buyCandidates.length}</Badge>
          <Badge variant="caution">Avoid {riskCandidates.length}</Badge>
          <Badge variant="neutral">Data {freshText}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <WatchCard
          label="Focus"
          title={latest.topOpportunity}
          detail={topFocus ? `대표 후보: ${primaryTicker(topFocus)} · ${topFocus.sector}` : "관심 확대 후보가 아직 없습니다."}
          tone="positive"
          icon={<Focus className="size-4 text-emerald-700" />}
        />
        <WatchCard
          label="Avoid"
          title={latest.topRisk}
          detail={topRisk ? `대표 경고: ${primaryTicker(topRisk)} · ${actionBiasLabel(topRisk.actionBias)}` : "명시적인 축소 신호가 없습니다."}
          tone="caution"
          icon={<ShieldAlert className="size-4 text-rose-700" />}
        />
        <WatchCard
          label="Monitor"
          title={monitorTheme?.theme ?? "확인할 테마 없음"}
          detail={monitorTheme?.whatToWatch ?? "다음 자동화 결과에서 확인 조건을 갱신합니다."}
          tone="neutral"
          icon={<AlertTriangle className="size-4 text-amber-700" />}
        />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Clock className="size-4" />
            Context
          </div>
          <p className="mt-3 text-base font-semibold leading-6 text-slate-950">
            {stageLabel(regime?.stage)} · crowd {regime?.crowdedness ?? "-"} · rotation {regime?.rotationProbability ?? "-"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {topFocus ? <Badge variant={getMarketBadgeVariant(topFocus.market)}>{getMarketLabel(topFocus.market)}</Badge> : null}
            <Badge variant="neutral">{latest.date}</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
