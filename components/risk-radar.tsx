import { AlertTriangle, ShieldAlert, Siren } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DailyAnalysis } from "@/lib/types";

function riskToneLabel(value?: number) {
  if (typeof value !== "number") return "확인 전";
  if (value >= 75) return "취약성 높음";
  if (value >= 50) return "중립 이상";
  return "안정적";
}

export function RiskRadar({ latest }: { latest: DailyAnalysis }) {
  const regime = latest.marketRegime;
  const avoidThemes =
    latest.themeRadar?.filter((theme) => theme.tradability === "avoid_chase" || theme.tradability === "watch_after_spike").slice(0, 3) ??
    [];
  const cautionSectors = latest.cautionSectors.slice(0, 3);

  return (
    <section className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/60 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">
            <Siren className="size-4" />
            Risk Radar
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">틀릴 수 있는 조건을 먼저 봅니다.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            리서치 판단은 방향성보다 무효화 조건과 추격 금지 구간이 더 중요할 때가 많습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="caution">Fragility {regime?.fragilityScore ?? "-"}</Badge>
          <Badge variant="neutral">{riskToneLabel(regime?.fragilityScore)}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-xl border border-rose-100 bg-white/90 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
            <AlertTriangle className="size-4" />
            Key Risk
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{latest.topRisk}</p>
        </div>

        <div className="rounded-xl border border-rose-100 bg-white/90 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
            <ShieldAlert className="size-4" />
            Avoid Chasing
          </div>
          <div className="mt-3 grid gap-2">
            {avoidThemes.length ? (
              avoidThemes.map((theme) => (
                <div key={`${theme.market}-${theme.theme}`} className="rounded-lg bg-rose-50 px-3 py-2">
                  <p className="text-sm font-semibold leading-5 text-slate-900">{theme.theme}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{theme.risk}</p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-600">명시적인 추격 금지 테마는 없습니다.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-rose-100 bg-white/90 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
            <ShieldAlert className="size-4" />
            Weak Areas
          </div>
          <div className="mt-3 grid gap-2">
            {cautionSectors.map((sector) => (
              <div key={`${sector.market}-${sector.sectorName}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{sector.sectorName}</p>
                <Badge variant="caution">#{sector.rank}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
