import { RadioTower, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ThemeRadarItem } from "@/lib/types";

function eventTypeLabel(value: ThemeRadarItem["eventType"]) {
  const labels: Record<ThemeRadarItem["eventType"], string> = {
    person_visit: "인물 방문",
    policy: "정책",
    regulation: "규제",
    earnings_event: "실적 이벤트",
    corporate_action: "기업 이벤트",
    geopolitics: "지정학",
    social_issue: "사회 이슈",
    product_launch: "제품/서비스",
    conference: "컨퍼런스",
    other: "기타",
  };
  return labels[value] ?? "기타";
}

function tradabilityLabel(value: ThemeRadarItem["tradability"]) {
  if (value === "actionable") return "실행 후보";
  if (value === "watch_after_spike") return "급등 후 관찰";
  if (value === "avoid_chase") return "추격 금지";
  return "확인 대기";
}

function tradabilityVariant(value: ThemeRadarItem["tradability"]) {
  if (value === "actionable") return "positive";
  if (value === "avoid_chase") return "caution";
  return "neutral";
}

function formatSignal(value: number) {
  return Math.round(Math.min(100, Math.max(0, value)));
}

export function ThemeRadarPanel({ themes }: { themes?: ThemeRadarItem[] }) {
  const items = (themes ?? []).slice(0, 5);

  if (!items.length) {
    return null;
  }

  return (
    <section className="mt-4 rounded-[1.75rem] border border-sky-100 bg-sky-50/70 p-4 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            <RadioTower className="size-4" />
            테마 레이더
          </div>
          <p className="mt-2 text-base font-semibold tracking-tight text-slate-950">
            단기 테마 신호 {items.length}개
          </p>
        </div>
        <Badge variant="neutral">추가 확인 필요</Badge>
      </div>

      <div className="mt-3 grid gap-2">
        {items.map((theme, index) => (
          <details
            key={`${theme.market}-${theme.theme}-${index}`}
            className="group rounded-2xl border border-sky-100 bg-white/90 px-3 py-2"
          >
            <summary className="grid cursor-pointer list-none gap-2 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="neutral">{theme.market}</Badge>
                  <Badge variant="neutral">{eventTypeLabel(theme.eventType)}</Badge>
                  <Badge variant={tradabilityVariant(theme.tradability)}>{tradabilityLabel(theme.tradability)}</Badge>
                  <Badge variant="neutral">신호 {formatSignal(theme.signalStrength)}</Badge>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-slate-950">{theme.theme}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 md:justify-end">
                {theme.affectedStocks.slice(0, 4).map((stock) => (
                  <Badge key={`${theme.theme}-${stock.market}-${stock.ticker}-summary`} variant="neutral">
                    {stock.ticker}
                  </Badge>
                ))}
              </div>
            </summary>
            <div className="mt-3 space-y-3 border-t border-sky-50 pt-3 text-sm leading-6 text-slate-700">
              <p>{theme.narrative}</p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">시장 반응</p>
                <p className="mt-1">{theme.marketReaction}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {theme.affectedStocks.slice(0, 6).map((stock) => (
                  <Badge key={`${theme.theme}-${stock.market}-${stock.ticker}`} variant="neutral">
                    {stock.ticker} {stock.actionBias ? `/${stock.actionBias}` : ""}
                  </Badge>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-white px-3 py-2 text-xs leading-5 text-rose-700">
                  <div className="mb-1 flex items-center gap-1 font-semibold text-rose-800">
                    <ShieldAlert className="size-3.5" />
                    리스크
                  </div>
                  {theme.risk}
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 text-xs leading-5 text-slate-700">
                  <span className="font-semibold text-slate-900">확인할 것: </span>
                  {theme.whatToWatch}
                </div>
              </div>
              {theme.evidence?.length ? (
                <p className="text-xs leading-5 text-slate-500">근거: {theme.evidence.slice(0, 3).join(" / ")}</p>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
