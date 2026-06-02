import { BarChart3, CheckCircle2, Clock3, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/site";
import type { ResultsAttributionCategory, WeeklyResultsReport } from "@/lib/types";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

function attributionLabel(category?: ResultsAttributionCategory) {
  if (category === "market-regime") return "국면 판단";
  if (category === "sector-selection") return "섹터 선택";
  if (category === "stock-selection") return "종목 선택";
  if (category === "timing") return "타이밍";
  if (category === "price-data") return "가격 데이터";
  if (category === "event-risk") return "이벤트 리스크";
  if (category === "risk-management") return "리스크 관리";
  return "미분류";
}

function buildFailureAttribution(report: WeeklyResultsReport) {
  const counts = new Map<string, number>();
  for (const item of report.evaluatedInsights) {
    if (item.verdict !== "failed") continue;
    const label = attributionLabel(item.attribution?.category);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

export function TrackRecordPreview({
  report,
  history = [],
}: {
  report: WeeklyResultsReport;
  history?: WeeklyResultsReport[];
}) {
  const scorecard = report.scorecard;
  const winRate =
    scorecard.evaluatedCount > 0 ? Math.round((scorecard.workedCount / scorecard.evaluatedCount) * 100) : 0;
  const recentReports = [report, ...history]
    .filter((item, index, arr) => arr.findIndex((candidate) => candidate.reportDate === item.reportDate) === index)
    .slice(0, 4);
  const failureAttribution = buildFailureAttribution(report);

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

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent Trend</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {recentReports.map((item) => {
              const itemWinRate =
                item.scorecard.evaluatedCount > 0
                  ? Math.round((item.scorecard.workedCount / item.scorecard.evaluatedCount) * 100)
                  : 0;
              return (
                <div key={item.reportDate} className="rounded-lg bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.evaluationWindow.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{itemWinRate}%</p>
                  <p className="text-xs text-slate-500">alpha {pct(item.scorecard.averageCallAlphaPct)}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Failure Attribution</p>
          <div className="mt-3 grid gap-2">
            {failureAttribution.length ? (
              failureAttribution.map(([label, count]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <Badge variant="caution">{count}건</Badge>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600">이번 평가에는 구조화된 실패 귀인이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
