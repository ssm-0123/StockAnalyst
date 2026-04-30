import { ArrowDownRight, ArrowRightLeft, CirclePause, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getMarketBadgeVariant, getMarketLabel } from "@/lib/market";
import { LegacySectorDecision } from "@/lib/types";

const decisionConfig = {
  hold: {
    label: "유지",
    variant: "neutral" as const,
    icon: CirclePause,
  },
  reduce: {
    label: "축소",
    variant: "caution" as const,
    icon: ArrowDownRight,
  },
  exit: {
    label: "정리",
    variant: "caution" as const,
    icon: X,
  },
  "reenter-watch": {
    label: "재진입 관찰",
    variant: "accent" as const,
    icon: ArrowRightLeft,
  },
};

export function AnalysisSuggestionPanel({ suggestions }: { suggestions?: LegacySectorDecision[] }) {
  if (!suggestions?.length) {
    return null;
  }

  return (
    <section className="mt-4 rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">과거 추천 섹터 후속 판단</h2>
          <p className="section-caption">
            예전에 상위 추천이었지만 지금 Top 3에서 빠진 섹터를 계속 들고 갈지, 줄일지, 정리할지 판단합니다.
          </p>
        </div>
        <Badge variant="neutral">{suggestions.length}개 판단</Badge>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {suggestions.map((item, index) => {
          const config = decisionConfig[item.decision];
          const Icon = config.icon;

          return (
            <div
              key={`legacy-sector-decision-${item.market}-${item.sectorName}-${index}`}
              className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getMarketBadgeVariant(item.market)}>{getMarketLabel(item.market)}</Badge>
                    <Badge variant={config.variant}>
                      <span className="inline-flex items-center gap-1">
                        <Icon className="size-3.5" />
                        {config.label}
                      </span>
                    </Badge>
                    <Badge variant="neutral">과거 최고 #{item.previousBestRank}</Badge>
                    <Badge variant="neutral">14일 중 {item.appearances14d}회</Badge>
                  </div>
                  <p className="mt-3 text-base font-semibold text-slate-950">{item.sectorName}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.rationale}</p>
              <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">후속 기준</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{item.triggerNote}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="neutral">마지막 상위권: {item.lastSeenDate}</Badge>
              </div>
              {item.resultsSummary ? (
                <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Results 근거</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{item.resultsSummary}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
