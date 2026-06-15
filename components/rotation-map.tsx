import { ArrowDown, ArrowRight, GitBranch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DailyAnalysis } from "@/lib/types";

function splitRotationLabel(value: string) {
  const [market, label] = value.includes("|") ? value.split("|").map((part) => part.trim()) : ["", value.trim()];
  return { market, label };
}

export function RotationMap({ latest }: { latest: DailyAnalysis }) {
  const rotations = latest.marketRegime?.nextRotation?.slice(0, 4) ?? [];
  const sourceSectors = latest.promisingSectors.slice(0, 3).map((sector) => sector.sectorName);
  const riskSectors = latest.cautionSectors.slice(0, 2).map((sector) => sector.sectorName);

  if (!rotations.length && !sourceSectors.length) {
    return null;
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <GitBranch className="size-4" />
            자금 이동 상세
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">자금 순환 지도</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            상단 단기 관점의 자금 이동 가설을 현재 리더와 다음 후보로 나눠 다시 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {riskSectors.map((sector) => (
            <Badge key={sector} variant="caution">
              혼잡/주의 {sector}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">현재 주도 영역</p>
          <div className="mt-3 grid gap-2">
            {sourceSectors.map((sector, index) => (
              <div key={sector} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="text-sm font-semibold text-slate-900">{sector}</span>
                <Badge variant={index === 0 ? "positive" : "neutral"}>#{index + 1}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">다음 순환 후보</p>
          <div className="mt-3 grid gap-2">
            {rotations.map((item, index) => {
              const { market, label } = splitRotationLabel(item);
              return (
                <div key={`${item}-${index}`} className="grid gap-2 rounded-xl bg-white px-3 py-3 md:grid-cols-[auto_1fr] md:items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">{market || "GLOBAL"}</Badge>
                    {index === 0 ? <ArrowRight className="hidden size-4 text-slate-400 md:block" /> : <ArrowDown className="size-4 text-slate-400 md:hidden" />}
                  </div>
                  <p className="text-sm font-semibold leading-5 text-slate-900">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
