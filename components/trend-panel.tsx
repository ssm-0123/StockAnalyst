import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendSummary } from "@/lib/types";

function DirectionIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") {
    return <ArrowUpRight className="size-4 text-emerald-600" />;
  }
  if (direction === "down") {
    return <ArrowDownRight className="size-4 text-rose-600" />;
  }
  return <ArrowRight className="size-4 text-slate-500" />;
}

function MiniBars({
  data,
  tone,
}: {
  data: Array<{ sector: string; count: number }>;
  tone: "positive" | "caution";
}) {
  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={`${tone}-${item.sector}-${index}`} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{item.sector}</span>
            <span className="font-medium text-slate-500">{item.count}일</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full ${tone === "positive" ? "bg-emerald-500" : "bg-rose-500"}`}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendPanel({ trendSummary }: { trendSummary: TrendSummary }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1.05fr_0.95fr]">
      <Card className="border-white/70 bg-white/90">
        <CardHeader className="pb-4">
          <CardTitle>7일 트렌드 요약</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">가장 자주 나온 유망 섹터</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {trendSummary.mostFrequentPromisingSector.sector}
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <DirectionIcon direction={trendSummary.mostFrequentPromisingSector.trendDirection} />
              {trendSummary.mostFrequentPromisingSector.appearances}회 등장
            </div>
          </div>
          <div className="rounded-2xl bg-rose-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-700">가장 자주 나온 주의 섹터</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {trendSummary.mostFrequentCautionSector.sector}
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <DirectionIcon direction={trendSummary.mostFrequentCautionSector.trendDirection} />
              {trendSummary.mostFrequentCautionSector.appearances}회 등장
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-white/70 bg-white/90">
        <CardHeader className="pb-4">
          <CardTitle>섹터 지속성</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <MiniBars data={trendSummary.promisingSectorSeries} tone="positive" />
          <MiniBars data={trendSummary.cautionSectorSeries} tone="caution" />
        </CardContent>
      </Card>
      <Card className="border-white/70 bg-white/90">
        <CardHeader className="pb-4">
          <CardTitle>가장 반복된 종목 아이디어</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trendSummary.repeatedStockIdeas.slice(0, 1).map((item, index) => (
            <div key={`lead-${item.ticker}-${index}`} className="rounded-2xl border border-slate-200/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{item.ticker}</p>
                  <p className="text-sm text-slate-500">7일 중 {item.appearances}회 등장</p>
                </div>
                <DirectionIcon direction={item.direction} />
              </div>
            </div>
          ))}
          <div className="space-y-2">
            {trendSummary.repeatedStockIdeas.slice(1, 4).map((item, index) => (
              <div
                key={`repeat-${item.ticker}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.ticker}</p>
                  <p className="text-xs text-slate-500">{item.appearances}x</p>
                </div>
                <DirectionIcon direction={item.direction} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
