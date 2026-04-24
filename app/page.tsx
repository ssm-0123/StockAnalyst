import { Activity, AlertCircle, BarChart3, RefreshCw, Shield } from "lucide-react";

import { ChangeList } from "@/components/change-list";
import { CheckpointList } from "@/components/checkpoint-list";
import { ReasonPanel } from "@/components/reason-panel";
import { SectorCard } from "@/components/sector-card";
import { SmallCapPanel } from "@/components/small-cap-panel";
import { SummaryCard } from "@/components/summary-card";
import { TrendPanel } from "@/components/trend-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLatestAnalysis, formatTimestamp } from "@/lib/dashboard";
import { withBasePath } from "@/lib/site";

export default async function HomePage() {
  const { latest, trendSummary, previousDay, smallCapTracking } = await getLatestAnalysis();
  const biggestChange =
    typeof latest.biggestChangeToday === "string"
      ? {
          label: latest.biggestChangeToday.split(/[.;]/)[0] ?? latest.biggestChangeToday,
          detail: latest.biggestChangeToday.split(/[.;]/).slice(1).join(".").trim() || "자세한 내용은 변화 섹션을 확인하세요.",
        }
      : latest.biggestChangeToday;

  const promisingPreviousRanks = new Map(
    previousDay?.promisingSectors.map((sector) => [sector.sectorName, sector.rank]) ?? [],
  );
  const cautionPreviousRanks = new Map(
    previousDay?.cautionSectors.map((sector) => [sector.sectorName, sector.rank]) ?? [],
  );

  return (
    <main className="dashboard-shell">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-6 py-8 text-white shadow-panel sm:px-8">
        <div className="absolute inset-0 bg-grid bg-[size:44px_44px] opacity-10" />
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="positive">일일 섹터 분석</Badge>
              <Badge variant="neutral" className="border-white/10 bg-white/10 text-slate-200">
                JSON 기반 UI
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              오늘 중요한 내용을 한눈에 확인합니다.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              이 대시보드는 `public/data/latest.json`에 기록된 자동화 분석 결과를 그대로 표시하며,
              빠른 스캔과 일일 의사결정에 맞춰 정보를 간결하게 정리합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <a href={withBasePath("/Results")}>
                <BarChart3 className="mr-2 size-4" />
                결과 평가 보기
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href={withBasePath("/data/latest.json")} target="_blank" rel="noreferrer">
                <RefreshCw className="mr-2 size-4" />
                최신 JSON 열기
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label="최상위 기회"
          value={latest.topOpportunity}
          detail="오늘 가장 높은 우선순위의 섹터"
          tone="positive"
        />
        <SummaryCard
          label="최상위 리스크"
          value={latest.topRisk}
          detail="오늘 가장 주의가 필요한 섹터"
          tone="caution"
        />
        <SummaryCard
          label="오늘의 신규 추천"
          value={String(latest.newPicksToday)}
          detail="새롭게 추가된 추천 종목 수"
          tone="positive"
        />
        <SummaryCard
          label="오늘의 신규 주의"
          value={String(latest.newCautionsToday)}
          detail="새롭게 추가된 주의 종목 수"
          tone="caution"
        />
        <SummaryCard
          label="오늘의 핵심 변화"
          value={biggestChange.label}
          detail={biggestChange.detail}
          tone="neutral"
          compact
        />
        <SummaryCard
          label="마지막 업데이트"
          value={formatTimestamp(latest.lastUpdated)}
          detail={latest.date}
          tone="neutral"
          isTimestamp
        />
      </section>

      {latest.validationSummary ? (
        <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-panel">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              <Shield className="size-4" />
              데이터 검증 상태
            </div>
            <p className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{latest.validationSummary.summary}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              총 {latest.validationSummary.totalIdeas}개 아이디어 중 {latest.validationSummary.highConfidenceIdeas}개를
              고신뢰로 분류했습니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Fresh"
              value={String(latest.validationSummary.freshSnapshots)}
              detail="최신 가격 스냅샷"
              tone="positive"
            />
            <SummaryCard
              label="Stale"
              value={String(latest.validationSummary.staleSnapshots)}
              detail="5일 이상 지난 가격"
              tone="caution"
            />
            <SummaryCard
              label="Incomplete"
              value={String(latest.validationSummary.incompleteSnapshots)}
              detail="일부 수치 누락"
              tone="neutral"
            />
            <SummaryCard
              label="Invalid"
              value={String(latest.validationSummary.invalidSnapshots)}
              detail="이상치 감지"
              tone="caution"
            />
          </div>
        </section>
      ) : null}

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-panel">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <BarChart3 className="size-4" />
            시장 톤
          </div>
          <p className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
            {latest.marketTone ?? "선별적 강세: 기회는 집중되고 리스크는 엇갈립니다."}
          </p>
        </div>
        <div className="space-y-4">
          <div className="section-heading mb-0">
            <div>
              <h2 className="section-title">오늘의 판단 근거</h2>
              <p className="section-caption">오늘 포지셔닝에 영향을 준 핵심 요인을 먼저 보여줍니다.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
              <AlertCircle className="size-4" />
              원문 그대로 표시
            </div>
          </div>
          <ReasonPanel reasons={latest.reasons} />
        </div>
      </section>

      <section className="mt-10">
        <div className="section-heading">
          <div>
            <h2 className="section-title">유망 섹터</h2>
            <p className="section-caption">최신 자동화 분석에서 상위 3개 매력 섹터입니다.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
            <Activity className="size-4" />
            기회 집중
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {latest.promisingSectors.map((sector, index) => (
            <SectorCard
              key={`promising-${sector.market}-${sector.sectorName}-${index}`}
              sector={sector}
              mode="promising"
              previousRank={promisingPreviousRanks.get(sector.sectorName) ?? null}
            />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="section-heading">
          <div>
            <h2 className="section-title">주의 / 회피 섹터</h2>
            <p className="section-caption">위험 대비 보상이 약하거나 확신이 낮은 구간입니다.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-sm text-rose-700">
            <Shield className="size-4" />
            리스크 관리
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {latest.cautionSectors.map((sector, index) => (
            <SectorCard
              key={`caution-${sector.market}-${sector.sectorName}-${index}`}
              sector={sector}
              mode="caution"
              previousRank={cautionPreviousRanks.get(sector.sectorName) ?? null}
            />
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <ChangeList changes={latest.changesSinceYesterday} />
        <CheckpointList checkpoints={latest.checkpoints} />
      </section>

      <section className="mt-10">
        <div className="section-heading">
          <div>
            <h2 className="section-title">저평가 / 기대 중소형주</h2>
            <p className="section-caption">
              대형주 주도장과 별도로 재평가 여지가 큰 중소형 종목 후보를 따로 모아 봅니다.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
            <Activity className="size-4" />
            리레이팅 후보
          </div>
        </div>
        <SmallCapPanel ideas={latest.smallCapIdeas} tracking={smallCapTracking} />
      </section>

      <section className="mt-10">
        <div className="section-heading">
          <div>
            <h2 className="section-title">7일 트렌드</h2>
            <p className="section-caption">
              이 영역은 자동화가 작성한 `trendSummary`를 우선 사용하고, 없으면 최소 집계값을 사용합니다.
            </p>
          </div>
        </div>
        <TrendPanel trendSummary={trendSummary} />
      </section>
    </main>
  );
}
