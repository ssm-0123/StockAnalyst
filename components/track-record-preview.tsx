import { BarChart3, CheckCircle2, Clock3, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/site";
import type { WeeklyResultsReport } from "@/lib/types";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export function TrackRecordPreview({ report }: { report: WeeklyResultsReport }) {
  const scorecard = report.scorecard;
  const winRate =
    scorecard.evaluatedCount > 0 ? Math.round((scorecard.workedCount / scorecard.evaluatedCount) * 100) : 0;

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <BarChart3 className="size-4" />
            Research Track Record
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">최근 판단 검증</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{report.summary}</p>
        </div>
        <Button asChild variant="secondary">
          <a href={withBasePath("/Results")}>결과 상세 보기</a>
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Win Rate</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{winRate}%</p>
          <p className="mt-1 text-xs text-slate-500">{scorecard.evaluatedCount}개 판단 평가</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            <CheckCircle2 className="size-4" />
            Worked
          </div>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{scorecard.workedCount}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            <Clock3 className="size-4" />
            Mixed
          </div>
          <p className="mt-2 text-3xl font-semibold text-amber-700">{scorecard.mixedCount}</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
            <TriangleAlert className="size-4" />
            Failed
          </div>
          <p className="mt-2 text-3xl font-semibold text-rose-700">{scorecard.failedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Average Alpha</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{pct(scorecard.averageCallAlphaPct)}</p>
          <Badge variant="neutral" className="mt-2">
            {report.evaluationWindow.label}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Best Call</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{scorecard.bestCall}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Weakest Call</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{scorecard.weakestCall}</p>
        </div>
      </div>
    </section>
  );
}
