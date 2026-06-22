import { CalendarClock, CheckCircle2, RadioTower, Scale, ShieldAlert } from "lucide-react";

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

function watchText(theme: ThemeRadarItem) {
  if (theme.watchDate) return `${theme.watchDate}: ${theme.whatToWatch}`;
  return theme.invalidation ?? theme.whatToWatch;
}

function pricedText(theme: ThemeRadarItem) {
  if (theme.alreadyPriced) return theme.alreadyPriced;
  if (theme.tradability === "watch_after_spike") return "상당 부분 반영";
  if (theme.tradability === "avoid_chase") return "추격 부담 큼";
  if (theme.tradability === "actionable") return "아직 실행 후보";
  return "추가 확인 필요";
}

function ThemeRow({ theme }: { theme: ThemeRadarItem }) {
  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[0.7fr_1.3fr_0.9fr] lg:items-center">
      <div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="neutral">{theme.market}</Badge>
          <Badge variant={tradabilityVariant(theme.tradability)}>{tradabilityLabel(theme.tradability)}</Badge>
          <Badge variant="neutral">강도 {formatSignal(theme.signalStrength)}</Badge>
        </div>
        <p className="mt-2 text-sm font-semibold leading-5 text-slate-950">{theme.theme}</p>
      </div>
      <div>
        <p className="line-clamp-2 text-sm leading-6 text-slate-600">{theme.marketReaction || theme.narrative}</p>
        <p className="mt-1 text-xs font-semibold text-amber-700">반영도: {pricedText(theme)}</p>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">확인 조건</p>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-700">{watchText(theme)}</p>
      </div>
    </div>
  );
}

function FeaturedTheme({ theme }: { theme: ThemeRadarItem }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="neutral">{theme.market}</Badge>
            <Badge variant="neutral">{eventTypeLabel(theme.eventType)}</Badge>
            <Badge variant={tradabilityVariant(theme.tradability)}>{tradabilityLabel(theme.tradability)}</Badge>
            <Badge variant="neutral">테마 강도 {formatSignal(theme.signalStrength)}</Badge>
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{theme.theme}</h3>
        </div>
        <Badge variant="neutral">{pricedText(theme)}</Badge>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_0.9fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Catalyst</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">{theme.narrative}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Market Reaction</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">{theme.marketReaction}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
          <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
            <Scale className="size-3.5" />
            Priced-in Check
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">{pricedText(theme)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-xl border border-white bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <CheckCircle2 className="size-3.5" />
            Beneficiaries
          </div>
          <div className="flex flex-wrap gap-2">
            {theme.affectedStocks.slice(0, 5).map((stock) => (
              <Badge key={`${theme.theme}-${stock.market}-${stock.ticker}`} variant="neutral">
                {stock.ticker} {stock.actionBias ? `· ${actionBiasLabel(stock.actionBias)}` : ""}
              </Badge>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
            <ShieldAlert className="size-3.5" />
            Consensus Risk
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-slate-700">{theme.risk}</p>
        </div>
        <div className="rounded-xl border border-white bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <CalendarClock className="size-3.5" />
            Watch
          </div>
          <p className="line-clamp-1 text-sm leading-6 text-slate-700">{watchText(theme)}</p>
        </div>
      </div>
    </article>
  );
}

export function ThemeRadarPanel({ themes }: { themes?: ThemeRadarItem[] }) {
  const items = (themes ?? []).slice(0, 5);
  const featured = items[0];
  const secondary = items.slice(1, 4);
  const hidden = items.slice(4);

  if (!items.length || !featured) return null;

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <RadioTower className="size-4" />
            Theme Intelligence
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">핵심 테마 하나와 후속 후보만 보여줍니다.</h2>
        </div>
        <Badge variant="neutral">{items.length}개 감지</Badge>
      </div>

      <div className="mt-5 grid gap-4">
        <FeaturedTheme theme={featured} />
        {secondary.length ? (
          <div className="grid gap-3">
            {secondary.map((theme) => (
              <ThemeRow key={`${theme.market}-${theme.theme}`} theme={theme} />
            ))}
          </div>
        ) : null}
      </div>

      {hidden.length ? (
        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">테마 신호 {hidden.length}개 더 보기</summary>
          <div className="mt-3 grid gap-3">
            {hidden.map((theme) => (
              <ThemeRow key={`${theme.market}-${theme.theme}`} theme={theme} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
