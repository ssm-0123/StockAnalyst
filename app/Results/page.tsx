import { BarChart3, CheckCircle2, Clock3, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getLatestResultsReport, formatTimestamp } from "@/lib/dashboard";

function verdictTone(verdict: "worked" | "mixed" | "failed") {
  if (verdict === "worked") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (verdict === "failed") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-amber-50 text-amber-700";
}

export default async function ResultsPage() {
  const { latest } = await getLatestResultsReport();

  return (
    <main className="dashboard-shell">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-6 py-8 text-white shadow-panel sm:px-8">
        <div className="absolute inset-0 bg-grid bg-[size:44px_44px] opacity-10" />
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="positive">주간 결과 평가</Badge>
              <Badge variant="neutral" className="border-white/10 bg-white/10 text-slate-200">
                Saved Snapshot Review
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">과거 인사이트의 실제 결과를 봅니다.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{latest.summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">평가 구간</p>
              <p className="mt-1 text-sm font-semibold text-white">{latest.evaluationWindow.label}</p>
              <p className="mt-1 text-xs text-slate-300">
                {latest.evaluationWindow.startDate} - {latest.evaluationWindow.endDate}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">최종 업데이트</p>
              <p className="mt-1 text-sm font-semibold text-white">{formatTimestamp(latest.lastUpdated)}</p>
              <p className="mt-1 text-xs text-slate-300">{latest.reportDate}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-panel">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <BarChart3 className="size-4" />
            전체 판정
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{latest.overallVerdict}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">베스트 콜</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{latest.scorecard.bestCall}</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">약한 콜</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{latest.scorecard.weakestCall}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-panel">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <CheckCircle2 className="size-4" />
              Worked
            </div>
            <p className="mt-3 text-3xl font-semibold text-emerald-700">{latest.scorecard.workedCount}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-panel">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Clock3 className="size-4" />
              Mixed
            </div>
            <p className="mt-3 text-3xl font-semibold text-amber-700">{latest.scorecard.mixedCount}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-panel">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <TriangleAlert className="size-4" />
              Failed
            </div>
            <p className="mt-3 text-3xl font-semibold text-rose-700">{latest.scorecard.failedCount}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-panel">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <TrendingUp className="size-4" />
              평균 알파
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{latest.scorecard.averageCallAlphaPct.toFixed(1)}%</p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-panel">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <TrendingDown className="size-4" />
            평가 수
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{latest.scorecard.evaluatedCount}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-panel">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <BarChart3 className="size-4" />
            Worked 비중
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {latest.scorecard.evaluatedCount > 0
              ? Math.round((latest.scorecard.workedCount / latest.scorecard.evaluatedCount) * 100)
              : 0}
            %
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-panel">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <Clock3 className="size-4" />
            평가 기준
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-950">{latest.benchmarkNote}</p>
        </div>
      </section>

      <section className="mt-10 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-panel">
          <h2 className="text-lg font-semibold text-slate-950">평가된 인사이트</h2>
          <p className="mt-1 text-sm text-slate-500">{latest.benchmarkNote}</p>
          <div className="mt-5 space-y-4">
            {latest.evaluatedInsights.map((item, index) => (
              <div
                key={`evaluated-${item.market}-${item.ticker}-${index}`}
                className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={item.verdict === "worked" ? "positive" : item.verdict === "failed" ? "caution" : "neutral"}>
                        {item.verdict}
                      </Badge>
                      <Badge variant="neutral">{item.market}</Badge>
                      <Badge variant="neutral">{item.stance}</Badge>
                      <span className="text-sm font-semibold text-slate-950">{item.companyName}</span>
                      <span className="text-sm text-slate-500">{item.ticker}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.thesis}</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-sm font-semibold ${verdictTone(item.verdict)}`}>
                    알파 {item.callAlphaPct > 0 ? "+" : ""}
                    {item.callAlphaPct.toFixed(1)}%
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">수익률</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {item.priceReturnPct > 0 ? "+" : ""}
                      {item.priceReturnPct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">벤치마크</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {item.benchmarkReturnPct > 0 ? "+" : ""}
                      {item.benchmarkReturnPct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">보유일수</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{item.holdingPeriodDays}일</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">{item.outcomeSummary}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">교훈: {item.lesson}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-panel">
            <h2 className="text-lg font-semibold text-slate-950">섹터 리뷰</h2>
            <div className="mt-4 space-y-3">
              {latest.sectorReviews.map((review, index) => (
                <div
                  key={`sector-review-${review.market}-${review.sectorName}-${index}`}
                  className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {review.market} | {review.sectorName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{review.priorView}</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-sm font-semibold ${verdictTone(review.verdict)}`}>
                      {review.verdict}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{review.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-panel">
            <h2 className="text-lg font-semibold text-slate-950">다음 주 개선 포인트</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              {latest.processTakeaways.map((item, index) => (
                <li key={`takeaway-${index}`} className="flex gap-3">
                  <span className="text-cyan-600">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-3xl border border-cyan-100 bg-cyan-50/60 p-4">
              <p className="text-sm font-semibold text-cyan-900">다음 주 포커스</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {latest.nextWeekFocus.map((item, index) => (
                  <li key={`focus-${index}`} className="flex gap-3">
                    <span className="text-cyan-600">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
