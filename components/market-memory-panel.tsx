import { History, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { withBasePath } from "@/lib/site";
import type { LegacySectorDecision, WeeklyResultsReport } from "@/lib/types";

function shortText(value: string, maxLength = 118) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

function pickSignal(report: WeeklyResultsReport) {
  const worked =
    report.evaluatedInsights.find((item) => item.verdict === "worked") ??
    report.evaluatedInsights.find((item) => item.verdict === "mixed") ??
    report.evaluatedInsights[0];

  if (!worked) return null;

  return {
    date: worked.entryDate,
    title: `${worked.sector} / ${worked.companyName}`,
    thesis: worked.thesis,
    outcome: worked.outcomeSummary,
  };
}

export function MarketMemoryPanel({
  report,
  legacyDecisions,
}: {
  report: WeeklyResultsReport;
  legacyDecisions: LegacySectorDecision[];
}) {
  const signal = pickSignal(report);
  const followUp = report.nextWeekFocus[0] ?? report.processTakeaways[0];
  const leader = legacyDecisions[0];

  if (!signal && !followUp && !leader) return null;

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <History className="size-4" />
            시장 기억
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">이 판단을 신뢰할 근거</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            과거 판단을 전면에 내세우기보다, 현재 단기 관점을 보정하는 근거로만 사용합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{report.evaluationWindow.label}</Badge>
          <a
            href={withBasePath("/Results")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            결과 상세
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {signal ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">이전 판단</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
              {signal.date} - {signal.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{shortText(signal.thesis)}</p>
          </div>
        ) : null}

        {followUp ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">후속 확인</p>
            <div className="mt-2 flex items-start gap-2">
              <Sparkles className="mt-1 size-4 shrink-0 text-emerald-600" />
              <p className="text-sm leading-6 text-slate-700">{shortText(followUp)}</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">결과와 기억</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {shortText(
              signal?.outcome ??
                (leader
                  ? `${leader.sectorName} is now ${leader.decision}; ${leader.triggerNote}`
                  : "최근 판단 결과를 다음 리포트의 체크리스트로 반영합니다."),
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
