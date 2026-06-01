import { CalendarClock, CheckCircle2, RadioTower, ShieldAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { actionBiasLabel } from "@/lib/public-display";
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

function freshnessLabel(value: ThemeRadarItem["sourceFreshness"]) {
  if (value === "today") return "오늘";
  if (value === "1-3d") return "1-3일";
  if (value === "stale") return "오래됨";
  return "미확인";
}

function pricedLabel(value: ThemeRadarItem["tradability"]) {
  if (value === "watch_after_spike") return "상당 부분 반영";
  if (value === "avoid_chase") return "추격 부담 큼";
  if (value === "actionable") return "아직 실행 후보";
  return "추가 확인 필요";
}

function ThemeCard({ theme, featured }: { theme: ThemeRadarItem; featured?: boolean }) {
  return (
    <article className={`rounded-2xl border bg-white p-4 ${featured ? "border-sky-200 shadow-sm" : "border-sky-100"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral">{theme.market}</Badge>
            <Badge variant="neutral">{eventTypeLabel(theme.eventType)}</Badge>
            <Badge variant={tradabilityVariant(theme.tradability)}>{tradabilityLabel(theme.tradability)}</Badge>
            <Badge variant="neutral">신호 {formatSignal(theme.signalStrength)}</Badge>
            <Badge variant="neutral">출처 {freshnessLabel(theme.sourceFreshness)}</Badge>
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{theme.theme}</h3>
        </div>
        <div className="rounded-xl bg-sky-50 p-2 text-sky-700">
          <Sparkles className="size-5" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Catalyst</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{theme.narrative}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Market Reaction</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{theme.marketReaction}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <CheckCircle2 className="size-3.5" />
          Beneficiaries
        </div>
        <div className="flex flex-wrap gap-2">
          {theme.affectedStocks.slice(0, 8).map((stock) => (
            <Badge key={`${theme.theme}-${stock.market}-${stock.ticker}`} variant="neutral">
              {stock.ticker} {stock.actionBias ? `· ${actionBiasLabel(stock.actionBias)}` : ""}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 text-sm leading-6 text-slate-700">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
            <ShieldAlert className="size-3.5" />
            Risk
          </div>
          {theme.risk}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <CalendarClock className="size-3.5" />
            Watch / Invalidation
          </div>
          {theme.whatToWatch}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Already Priced?</p>
          <p className="mt-1 font-semibold text-slate-950">{pricedLabel(theme.tradability)}</p>
        </div>
      </div>

      {theme.evidence?.length ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Evidence</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{theme.evidence.slice(0, 3).join(" / ")}</p>
        </div>
      ) : null}
    </article>
  );
}

export function ThemeRadarPanel({ themes }: { themes?: ThemeRadarItem[] }) {
  const items = (themes ?? []).slice(0, 5);

  if (!items.length) {
    return null;
  }

  return (
    <section className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            <RadioTower className="size-4" />
            Theme Intelligence
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            테마를 사건, 수혜자, 리스크로 해석합니다.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            접힌 목록이 아니라 바로 읽을 수 있는 리서치 카드로 핵심 테마를 보여줍니다.
          </p>
        </div>
        <Badge variant="neutral">{items.length} themes</Badge>
      </div>

      <div className="mt-5 grid gap-4">
        {items.slice(0, 2).map((theme, index) => (
          <ThemeCard key={`${theme.market}-${theme.theme}-${index}`} theme={theme} featured />
        ))}
      </div>

      {items.length > 2 ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {items.slice(2).map((theme, index) => (
            <ThemeCard key={`${theme.market}-${theme.theme}-${index + 2}`} theme={theme} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
