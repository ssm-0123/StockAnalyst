import { ArrowDownRight, ArrowUpRight, ChevronDown, Minus, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getMarketBadgeVariant, getMarketLabel } from "@/lib/market";
import { cn } from "@/lib/utils";
import { ConfidenceLevel, SnapshotHealth, StockIdea } from "@/lib/types";

const badgeMap = {
  NEW: { label: "신규", icon: Sparkles, className: "bg-emerald-50 text-emerald-700" },
  HOLD: { label: "유지", icon: Minus, className: "bg-slate-100 text-slate-600" },
  UPGRADE: { label: "상향", icon: ArrowUpRight, className: "bg-emerald-50 text-emerald-700" },
  DOWNGRADE: { label: "하향", icon: ArrowDownRight, className: "bg-rose-50 text-rose-700" },
  REMOVED: { label: "제외", icon: X, className: "bg-rose-50 text-rose-700" },
} as const;

function normalizeStatus(stock: StockIdea) {
  if (stock.isNew || stock.change === "new") {
    return "NEW" as const;
  }

  if (stock.change === "no-change" || stock.change === "hold") {
    return "HOLD" as const;
  }

  if (stock.change === "up" || stock.change === "upgrade") {
    return "UPGRADE" as const;
  }

  if (stock.change === "down" || stock.change === "downgrade") {
    return "DOWNGRADE" as const;
  }

  return "REMOVED" as const;
}

function formatPrice(value?: number, market?: StockIdea["market"], currency?: "KRW" | "USD") {
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

function confidenceVariant(level?: ConfidenceLevel) {
  if (level === "high") return "positive" as const;
  if (level === "low") return "caution" as const;
  return "neutral" as const;
}

function confidenceLabel(level?: ConfidenceLevel) {
  if (level === "high") return "High";
  if (level === "low") return "Low";
  return "Medium";
}

function healthVariant(health?: SnapshotHealth) {
  if (health === "fresh") return "positive" as const;
  if (health === "partial" || health === "missing") return "neutral" as const;
  return "caution" as const;
}

function healthLabel(health?: SnapshotHealth) {
  if (health === "fresh") return "fresh";
  if (health === "stale") return "stale";
  if (health === "invalid") return "invalid";
  if (health === "missing") return "missing";
  return "partial";
}

export function StockRow({ stock, caution = false }: { stock: StockIdea; caution?: boolean }) {
  const status = normalizeStatus(stock);
  const config = badgeMap[status];
  const Icon = config.icon;

  const snapshot = stock.priceSnapshot;
  const currency = snapshot?.currency ?? (stock.market === "KR" ? "KRW" : "USD");
  const hasSnapshotMetrics =
    snapshot?.currentPrice != null ||
    snapshot?.previousCloseChangePct != null ||
    snapshot?.week52High != null ||
    snapshot?.week52Low != null;

  return (
    <details className="group rounded-2xl border border-slate-200/80 bg-white/70">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-[0.18em] text-slate-900">{stock.ticker}</span>
            <Badge variant={getMarketBadgeVariant(stock.market)} className="px-2 py-0.5 text-[10px]">
              {getMarketLabel(stock.market)}
            </Badge>
            <Badge variant={confidenceVariant(stock.confidenceLevel)} className="px-2 py-0.5 text-[10px]">
              {confidenceLabel(stock.confidenceLevel)}
            </Badge>
            <p className="truncate text-sm font-medium text-slate-500">{stock.companyName}</p>
          </div>
          <p className={cn("mt-1 text-sm leading-5 text-slate-600", caution && "text-slate-700")}>
            {stock.rationale}
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
            클릭해서 저장된 가격 스냅샷 보기
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              config.className,
            )}
          >
            <Icon className="size-3.5" />
            {config.label}
          </div>
          <div className="rounded-full bg-slate-100 p-1.5 text-slate-500 transition-transform group-open:rotate-180">
            <ChevronDown className="size-3.5" />
          </div>
        </div>
      </summary>
      <div className="border-t border-slate-200/80 px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">분석 시점 스냅샷</p>
          <div className="flex items-center gap-2">
            <Badge variant={healthVariant(stock.snapshotHealth)} className="px-2 py-0.5 text-[10px]">
              {healthLabel(stock.snapshotHealth)}
            </Badge>
            <span className="text-xs text-slate-500">{snapshot?.priceDate || "업데이트 예정"}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">현재가</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatPrice(snapshot?.currentPrice, stock.market, currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">전거래일 대비</p>
            <p
              className={cn(
                "mt-1 text-sm font-semibold",
                typeof snapshot?.previousCloseChangePct === "number"
                  ? snapshot.previousCloseChangePct >= 0
                    ? "text-emerald-700"
                    : "text-rose-700"
                  : "text-slate-900",
              )}
            >
              {formatPercent(snapshot?.previousCloseChangePct)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">52주 최고</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatPrice(snapshot?.week52High, stock.market, currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">52주 최저</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatPrice(snapshot?.week52Low, stock.market, currency)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>{snapshot?.sourceNote ?? "자동화가 저장한 분석 시점 가격입니다."}</span>
        </div>
        {stock.validationIssues?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {stock.validationIssues.map((issue) => (
              <Badge
                key={`${stock.ticker}-${issue.code}`}
                variant={issue.severity === "critical" ? "caution" : "neutral"}
                className="px-2 py-0.5 text-[10px]"
                title={issue.detail}
              >
                {issue.label}
              </Badge>
            ))}
          </div>
        ) : null}
        {!hasSnapshotMetrics ? (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-500">
            아직 분석 시점 가격 스냅샷 데이터가 없습니다.
          </div>
        ) : null}
      </div>
    </details>
  );
}
