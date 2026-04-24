import { AlertTriangle, ArrowRight, ArrowUpRight, ChevronDown, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getMarketBadgeVariant, getMarketLabel } from "@/lib/market";
import { SectorEntry } from "@/lib/types";
import { StockRow } from "@/components/stock-row";

function confidenceVariant(level?: SectorEntry["confidenceLevel"]) {
  if (level === "high") return "positive" as const;
  if (level === "low") return "caution" as const;
  return "neutral" as const;
}

function confidenceLabel(level?: SectorEntry["confidenceLevel"]) {
  if (level === "high") return "High";
  if (level === "low") return "Low";
  return "Medium";
}

export function SectorCard({
  sector,
  mode,
  previousRank,
}: {
  sector: SectorEntry;
  mode: "promising" | "caution";
  previousRank?: number | null;
}) {
  const positive = mode === "promising";
  const primaryList = positive ? sector.keyDrivers : sector.headwinds;
  const secondaryList = positive ? sector.risks : sector.whatCouldImprove;
  const visibleDrivers = primaryList?.slice(0, 2) ?? [];
  const extraDrivers = primaryList?.slice(2) ?? [];
  const rankDelta =
    previousRank == null ? null : previousRank > sector.rank ? "up" : previousRank < sector.rank ? "down" : "flat";

  return (
    <Card className="h-full border-white/70 bg-white/90 backdrop-blur">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={positive ? "positive" : "caution"}>#{sector.rank}</Badge>
              <Badge variant={getMarketBadgeVariant(sector.market)}>{getMarketLabel(sector.market)}</Badge>
              <Badge variant="neutral">신뢰도 {sector.confidenceScore}</Badge>
              <Badge variant={confidenceVariant(sector.confidenceLevel)}>{confidenceLabel(sector.confidenceLevel)}</Badge>
            </div>
            <CardTitle className="text-xl text-slate-950">{sector.sectorName}</CardTitle>
          </div>
          <div
            className={`rounded-2xl p-2.5 ${positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
          >
            {positive ? <ArrowUpRight className="size-5" /> : <ShieldAlert className="size-5" />}
          </div>
        </div>
        <div
          className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${
            rankDelta === "up"
              ? "bg-emerald-50 text-emerald-700"
              : rankDelta === "down"
                ? "bg-rose-50 text-rose-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          <span className="font-medium">
            전일: {previousRank ? `#${previousRank}` : "순위 밖"}
          </span>
          <ArrowRight className="size-4" />
          <span className="font-semibold">오늘: #{sector.rank}</span>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-slate-600">{sector.thesis}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">
            {positive ? "핵심 요인" : "주요 부담 요인"}
          </p>
          <ul className="space-y-2 text-sm leading-5 text-slate-600">
            {visibleDrivers.map((item, index) => (
              <li key={`${mode}-driver-${index}-${item}`} className="flex gap-2">
                <span className={positive ? "text-emerald-600" : "text-rose-600"}>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <Separator />
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">
              {positive ? "추천 종목" : "주의 종목"}
            </p>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">3개 아이디어</p>
          </div>
          <div className="space-y-2.5">
            {sector.stocks.map((stock, index) => (
              <StockRow
                key={`${mode}-stock-${sector.market}-${sector.sectorName}-${stock.market}-${stock.ticker}-${index}`}
                stock={stock}
                caution={!positive}
              />
            ))}
          </div>
        </div>
        <details className="group rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-700">
            <span>상세 보기</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">
                {positive ? "추가 요인" : "추가 부담 요인"}
              </p>
              <ul className="space-y-2 text-sm leading-5 text-slate-600">
                {extraDrivers.length ? (
                  extraDrivers.map((item, index) => (
                    <li key={`${mode}-extra-driver-${index}-${item}`} className="flex gap-2">
                      <span className={positive ? "text-emerald-600" : "text-rose-600"}>•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">추가 항목 없음</li>
                )}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">
                {positive ? "리스크" : "개선 조건"}
              </p>
              <ul className="space-y-2 text-sm leading-5 text-slate-600">
                {secondaryList?.map((item, index) => (
                  <li key={`${mode}-secondary-${index}-${item}`} className="flex gap-2">
                    <span className="text-slate-400">
                      <AlertTriangle className="mt-0.5 size-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
