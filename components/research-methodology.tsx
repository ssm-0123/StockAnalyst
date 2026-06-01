import { Database, Gauge, Info, RadioTower, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DailyAnalysis } from "@/lib/types";

function qualityText(latest: DailyAnalysis) {
  const validation = latest.validationSummary;
  if (!validation || validation.totalIdeas === 0) return "가격 검증 대기";
  return `${validation.freshSnapshots}/${validation.totalIdeas} fresh`;
}

export function ResearchMethodology({ latest }: { latest: DailyAnalysis }) {
  const sectorExample = latest.promisingSectors[0];
  const themeExample = latest.themeRadar?.[0];
  const stockExample = latest.promisingSectors.flatMap((sector) => sector.stocks)[0] ?? latest.smallCapIdeas?.[0];

  return (
    <section className="mt-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <Info className="size-4" />
            Methodology / Signal System
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">숫자는 하나의 매수 점수가 아니라 리서치 맥락입니다.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            산식이 다른 수치를 하나의 Signal Score로 포장하지 않고, 각각의 의미를 분리해서 표시합니다.
          </p>
        </div>
        <Badge variant="neutral">{qualityText(latest)}</Badge>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Gauge className="size-4" />
            Sector Conviction
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{sectorExample?.confidenceScore ?? "-"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            섹터 thesis와 가격 위치, 리스크를 종합한 확신도입니다. 종목 매수 점수와 동일하지 않습니다.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <RadioTower className="size-4" />
            Theme Signal
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{themeExample?.signalStrength ?? "대기"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            뉴스/이벤트가 가격 반응과 수혜 종목으로 연결되는 강도입니다. 추격 가능성과는 별도로 봅니다.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ShieldCheck className="size-4" />
            Research Confidence
          </div>
          <p className="mt-2 text-3xl font-semibold capitalize text-slate-950">{stockExample?.confidenceLevel ?? "medium"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            개별 아이디어의 논리와 데이터 신뢰도입니다. High라도 무효화 조건이 사라지는 것은 아닙니다.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Database className="size-4" />
            Data Freshness
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{qualityText(latest)}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            저장된 분석 시점 가격 스냅샷 기준입니다. 시장별 휴장과 시차 때문에 기준일은 종목별로 다를 수 있습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
