import { Gem, Sparkles, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMarketBadgeVariant, getMarketLabel } from "@/lib/market";
import { SmallCapIdea, SmallCapTrackingMeta } from "@/lib/types";

function formatPrice(value?: number, market?: SmallCapIdea["market"], currency?: "KRW" | "USD") {
  if (typeof value !== "number") {
    return "업데이트 예정";
  }

  return new Intl.NumberFormat(market === "KR" ? "ko-KR" : "en-US", {
    style: "currency",
    currency: currency ?? (market === "KR" ? "KRW" : "USD"),
    maximumFractionDigits: market === "KR" ? 0 : 2,
  }).format(value);
}

function formatPercent(value?: number) {
  if (typeof value !== "number") {
    return "업데이트 예정";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function SmallCapPanel({
  ideas,
  tracking,
}: {
  ideas?: SmallCapIdea[];
  tracking?: Map<string, SmallCapTrackingMeta>;
}) {
  if (!ideas?.length) {
    return (
      <Card className="border-white/70 bg-white/90">
        <CardHeader className="pb-3">
          <CardTitle>저평가 / 기대 중소형주</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
            다음 자동화 실행부터 중소형 기대주 추천이 이 영역에 표시됩니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {ideas.map((idea, index) => {
        const snapshot = idea.priceSnapshot;
        const trackingMeta = tracking?.get(idea.ticker);
        const hasSnapshot =
          snapshot?.currentPrice != null ||
          snapshot?.previousCloseChangePct != null ||
          snapshot?.week52High != null ||
          snapshot?.week52Low != null;

        return (
        <Card
          key={`smallcap-${idea.market}-${idea.ticker}-${index}`}
          className="border-white/70 bg-white/90 backdrop-blur"
        >
          <CardHeader className="space-y-3 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="positive">#{idea.rank}</Badge>
                  <Badge variant={getMarketBadgeVariant(idea.market)}>{getMarketLabel(idea.market)}</Badge>
                  <Badge variant="neutral">{idea.sector}</Badge>
                  {trackingMeta?.consecutiveDays && trackingMeta.consecutiveDays > 1 ? (
                    <Badge variant="accent">연속 {trackingMeta.consecutiveDays}일 추적</Badge>
                  ) : null}
                  {trackingMeta?.appearances7d ? (
                    <Badge variant="neutral">7일 중 {trackingMeta.appearances7d}회</Badge>
                  ) : null}
                </div>
                <CardTitle className="text-xl text-slate-950">{idea.companyName}</CardTitle>
                <p className="mt-1 text-sm font-semibold tracking-[0.18em] text-slate-500">{idea.ticker}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-2.5 text-amber-700">
                <Gem className="size-5" />
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50/80 px-3 py-2 text-sm text-amber-800">
              <span className="font-semibold">테마:</span> {idea.theme}
            </div>
            <p className="text-sm leading-6 text-slate-600">{idea.thesis}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Sparkles className="size-4" />
                왜 지금 보나
              </div>
              <p className="text-sm leading-6 text-slate-700">{idea.whyNow}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                <Gem className="size-4" />
                아직 보는 이유
              </div>
              <p className="text-sm leading-6 text-slate-700">
                {idea.followThroughNote ??
                  "자동화가 다음 실행부터 이 종목을 계속 보는 이유와 추가 상승 여지를 이 영역에 함께 기록합니다."}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800">
                  분석 시점 가격 스냅샷
                </p>
                <span className="text-xs text-slate-500">{snapshot?.priceDate ?? "업데이트 예정"}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-cyan-100 bg-white/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">현재가</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatPrice(snapshot?.currentPrice, idea.market, snapshot?.currency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-100 bg-white/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    전거래일 대비
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatPercent(snapshot?.previousCloseChangePct)}
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-100 bg-white/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">52주 최고</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatPrice(snapshot?.week52High, idea.market, snapshot?.currency)}
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-100 bg-white/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">52주 최저</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatPrice(snapshot?.week52Low, idea.market, snapshot?.currency)}
                  </p>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {snapshot?.sourceNote ?? "자동화가 저장한 기대주 분석 시점 가격입니다."}
              </div>
              {!hasSnapshot ? (
                <div className="mt-3 rounded-2xl border border-dashed border-cyan-100 bg-white/80 px-3 py-2 text-sm text-slate-500">
                  아직 기대주 가격 스냅샷 데이터가 없습니다.
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  밸류 포인트
                </p>
                <p className="text-sm leading-6 text-slate-700">{idea.valuationNote}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  유동성 체크
                </p>
                <p className="text-sm leading-6 text-slate-700">{idea.liquidityNote}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900">핵심 촉매</p>
                <ul className="space-y-2 text-sm leading-5 text-slate-600">
                  {idea.catalysts.slice(0, 3).map((item, catalystIndex) => (
                    <li key={`catalyst-${idea.ticker}-${catalystIndex}`} className="flex gap-2">
                      <span className="text-emerald-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <TriangleAlert className="size-4 text-rose-600" />
                  리스크
                </p>
                <ul className="space-y-2 text-sm leading-5 text-slate-600">
                  {idea.risks.slice(0, 3).map((item, riskIndex) => (
                    <li key={`risk-${idea.ticker}-${riskIndex}`} className="flex gap-2">
                      <span className="text-rose-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
