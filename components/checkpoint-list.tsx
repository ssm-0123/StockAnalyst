import { CalendarClock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMarketBadgeVariant, getMarketLabel } from "@/lib/market";
import { CheckpointItem } from "@/lib/types";

const categoryStyles = {
  earnings: "bg-cyan-50 text-cyan-700",
  macro: "bg-amber-50 text-amber-700",
  policy: "bg-emerald-50 text-emerald-700",
  risk: "bg-rose-50 text-rose-700",
} as const;

const categoryLabels = {
  earnings: "실적",
  macro: "거시",
  policy: "정책",
  risk: "리스크",
} as const;

export function CheckpointList({ checkpoints }: { checkpoints: CheckpointItem[] }) {
  return (
    <Card className="border-white/70 bg-white/90">
      <CardHeader>
        <CardTitle>다음 체크포인트</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {checkpoints.map((item, index) => (
          <div
            key={`${item.category}-${item.title}-${item.date}-${index}`}
            className="rounded-2xl border border-slate-200/80 bg-white/80 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] ${categoryStyles[item.category]}`}
                >
                  {categoryLabels[item.category]}
                </span>
                {item.market ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      getMarketBadgeVariant(item.market) === "accent"
                        ? "border border-cyan-200 bg-cyan-50 text-cyan-700"
                        : getMarketBadgeVariant(item.market) === "neutral"
                          ? "border border-slate-200 bg-white text-slate-600"
                          : "border border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                  >
                    {getMarketLabel(item.market)}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CalendarClock className="size-3.5" />
                {item.date}
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
