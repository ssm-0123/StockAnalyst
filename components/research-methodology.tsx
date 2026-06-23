import { Database, Gauge, Info, RadioTower, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DailyAnalysis } from "@/lib/types";

function qualityText(latest: DailyAnalysis) {
  const validation = latest.validationSummary;
  if (!validation || validation.totalIdeas === 0) return "가격 검증 대기";
  return `${validation.freshSnapshots}/${validation.totalIdeas} 최신`;
}

function confidenceLabel(value?: string) {
  if (value === "high") return "높음";
  if (value === "low") return "낮음";
  return "보통";
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
            산출 방식 / 신호 체계
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">숫자는 하나의 매수 점수가 아니라 리서치 맥락입니다.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            산식이 다른 수치를 하나의 매수 점수로 포장하지 않고, 각각의 의미를 분리해서 표시합니다.
          </p>
        </div>
        <Badge variant="neutral">{qualityText(latest)}</Badge>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Gauge className="size-4" />
            섹터 확신도
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{sectorExample?.confidenceScore ?? "-"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            섹터 투자 가설과 가격 위치, 리스크를 종합한 확신도입니다. 종목 매수 점수와 동일하지 않습니다.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <RadioTower className="size-4" />
            테마 신호
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{themeExample?.signalStrength ?? "대기"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            뉴스/이벤트가 가격 반응과 수혜 종목으로 연결되는 강도입니다. 추격 가능성과는 별도로 봅니다.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ShieldCheck className="size-4" />
            리서치 신뢰도
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{confidenceLabel(stockExample?.confidenceLevel)}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            개별 아이디어의 논리와 데이터 신뢰도입니다. 높음이라도 무효화 조건이 사라지는 것은 아닙니다.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Database className="size-4" />
            데이터 신선도
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{qualityText(latest)}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            저장된 분석 시점 가격 스냅샷 기준입니다. 시장별 휴장과 시차 때문에 기준일은 종목별로 다를 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Favor</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            즉시 매수 지시가 아니라, 앞으로 자금이 이동할 가능성이 높은 관찰 축입니다. 가격 위치와 무효화 조건을 함께 봅니다.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Confidence</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            맞을 확률이 아니라 근거 품질 점수입니다. 외부 이벤트, 가격 신선도, 테마 확산, 리스크 조건이 약하면 올라가기 어렵습니다.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Already Priced</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            모두가 아는 호재인지 확인하는 장치입니다. 좋은 뉴스라도 이미 가격에 반영됐다면 추격보다 확인/눌림 조건이 우선입니다.
          </p>
        </div>
      </div>
    </section>
  );
}
