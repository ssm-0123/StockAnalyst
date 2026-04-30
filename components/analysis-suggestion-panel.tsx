import { Archive, ArrowRightLeft, Eye, Scissors } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AnalysisSuggestion } from "@/lib/types";

const actionConfig = {
  watch: {
    label: "관찰 유지",
    variant: "neutral" as const,
    icon: Eye,
  },
  trim: {
    label: "정리 제안",
    variant: "caution" as const,
    icon: Scissors,
  },
  rotate: {
    label: "교체 제안",
    variant: "accent" as const,
    icon: ArrowRightLeft,
  },
  archive: {
    label: "아카이브",
    variant: "default" as const,
    icon: Archive,
  },
};

export function AnalysisSuggestionPanel({ suggestions }: { suggestions?: AnalysisSuggestion[] }) {
  if (!suggestions?.length) {
    return null;
  }

  return (
    <section className="mt-4 rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">새 분석 제안</h2>
          <p className="section-caption">기존 추천 섹터를 유지할지, 줄일지, 교체할지에 대한 제안을 모아 봅니다.</p>
        </div>
        <Badge variant="neutral">{suggestions.length}개 제안</Badge>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {suggestions.map((item, index) => {
          const config = actionConfig[item.action];
          const Icon = config.icon;

          return (
            <div
              key={`analysis-suggestion-${item.action}-${index}`}
              className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={config.variant}>
                      <span className="inline-flex items-center gap-1">
                        <Icon className="size-3.5" />
                        {config.label}
                      </span>
                    </Badge>
                    {item.priority === "high" ? <Badge variant="caution">우선 검토</Badge> : null}
                    {item.source === "results-review" ? <Badge variant="neutral">Results 반영</Badge> : null}
                  </div>
                  <p className="mt-3 text-base font-semibold text-slate-950">{item.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.detail}</p>
              <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">근거</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{item.rationale}</p>
              </div>
              {item.affectedSectors?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.affectedSectors.map((sector, sectorIndex) => (
                    <Badge key={`suggestion-sector-${index}-${sectorIndex}`} variant="neutral">
                      {sector}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
