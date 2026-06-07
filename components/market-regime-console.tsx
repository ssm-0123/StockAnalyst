import { AlertTriangle, CalendarDays, Gauge, Layers3, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DailyAnalysis, MarketRegimeAssessment } from "@/lib/types";

function stageLabel(stage?: MarketRegimeAssessment["stage"]) {
  if (stage === "early") return "Early";
  if (stage === "late") return "Late";
  return "Mid";
}

function clampScore(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function riskLevel(regime: MarketRegimeAssessment) {
  if (regime.fragilityScore >= 78 || regime.crowdedness >= 85 || regime.riskReward <= 45) return "High";
  if (regime.fragilityScore >= 60 || regime.crowdedness >= 65 || regime.riskReward <= 60) return "Medium";
  return "Low";
}

function confidenceScore(latest: DailyAnalysis) {
  const regime = latest.marketRegime;
  const topSector = latest.promisingSectors[0];
  const topTheme = latest.themeRadar?.[0];
  if (!regime) return topSector?.confidenceScore ?? 0;
  return clampScore(
    (topSector?.confidenceScore ?? regime.rotationProbability) * 0.42 +
      (topTheme?.signalStrength ?? regime.rotationProbability) * 0.28 +
      regime.rotationProbability * 0.18 +
      (100 - regime.fragilityScore) * 0.12,
  );
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function regimeDurationDays(latest: DailyAnalysis, history: DailyAnalysis[] = []) {
  const stage = latest.marketRegime?.stage;
  if (!stage) return 1;

  const byDate = new Map<string, DailyAnalysis>();
  for (const entry of [latest, ...history]) {
    const current = byDate.get(entry.date);
    if (!current || (entry.lastUpdated ?? "") > (current.lastUpdated ?? "")) {
      byDate.set(entry.date, entry);
    }
  }

  const entries = Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  let oldestDate = latest.date;

  for (const entry of entries) {
    if (entry.marketRegime?.stage !== stage) break;
    oldestDate = entry.date;
  }

  const start = parseDate(oldestDate);
  const end = parseDate(latest.date);
  if (!start || !end) return entries.filter((entry) => entry.marketRegime?.stage === stage).length;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function scoreTone(value: number, inverse = false) {
  const high = inverse ? value <= 40 : value >= 70;
  const low = inverse ? value >= 70 : value <= 40;
  if (high) return "bg-emerald-600";
  if (low) return "bg-rose-600";
  return "bg-amber-500";
}

function Metric({
  label,
  value,
  inverse,
}: {
  label: string;
  value?: number;
  inverse?: boolean;
}) {
  const score = clampScore(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-950">{score}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${scoreTone(score, inverse)}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function MarketRegimeConsole({
  latest,
  history = [],
}: {
  latest: DailyAnalysis;
  history?: DailyAnalysis[];
}) {
  const regime = latest.marketRegime;
  if (!regime) return null;

  const confidence = confidenceScore(latest);
  const duration = regimeDurationDays(latest, history);
  const risk = riskLevel(regime);

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <Gauge className="size-4" />
            Current Regime
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {stageLabel(regime.stage)} Market Regime
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{regime.summary}</p>
        </div>
        <Badge variant={risk === "High" ? "caution" : risk === "Low" ? "positive" : "neutral"}>{risk} Risk</Badge>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Shield className="size-4" />
              Confidence
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{confidence}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <CalendarDays className="size-4" />
              Duration
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{duration}d</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <AlertTriangle className="size-4" />
              Risk Level
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{risk}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Crowdedness" value={regime.crowdedness} inverse />
            <Metric label="Risk Reward" value={regime.riskReward} />
            <Metric label="Rotation" value={regime.rotationProbability} />
            <Metric label="Fragility" value={regime.fragilityScore} inverse />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Layers3 className="size-4" />
                Breadth
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{regime.breadth}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Shield className="size-4" />
                Positioning
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{regime.positioning}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
