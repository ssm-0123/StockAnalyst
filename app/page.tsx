import { Activity, AlertCircle, CheckCircle2, Shield } from "lucide-react";

import { ActionCommandPanel, type DashboardActionCandidate } from "@/components/action-command-panel";
import { AnalysisSuggestionPanel } from "@/components/analysis-suggestion-panel";
import { ChangeList } from "@/components/change-list";
import { CheckpointList } from "@/components/checkpoint-list";
import { MarketRegimeConsole } from "@/components/market-regime-console";
import { ReasonPanel } from "@/components/reason-panel";
import { RegimeChangePanel } from "@/components/regime-change-panel";
import { ResearchMethodology } from "@/components/research-methodology";
import { ResearchOpportunities } from "@/components/research-opportunities";
import { RiskRadar } from "@/components/risk-radar";
import { RotationMap } from "@/components/rotation-map";
import { SectorCard } from "@/components/sector-card";
import { SmallCapPanel } from "@/components/small-cap-panel";
import { ThemeRadarPanel } from "@/components/theme-radar-panel";
import { TrackRecordPreview } from "@/components/track-record-preview";
import { TrendPanel } from "@/components/trend-panel";
import { Badge } from "@/components/ui/badge";
import { buildLegacySectorDecisions, getLatestAnalysis, getLatestResultsReport } from "@/lib/dashboard";
import { ActionBias, SmallCapIdea, StockIdea } from "@/lib/types";

function resolveStockActionBias(stock: StockIdea): ActionBias {
  if (stock.actionBias) return stock.actionBias;
  if (stock.isNew || stock.change === "new" || stock.change === "upgrade") return "buy";
  if (stock.change === "downgrade") return "reduce";
  if (stock.change === "removed") return "exit";
  return "hold";
}

function resolveSmallCapActionBias(idea: SmallCapIdea): ActionBias {
  return idea.actionBias ?? "buy";
}

export default async function HomePage() {
  const { latest, history, trendSummary, previousDay, smallCapTracking } = await getLatestAnalysis();
  const { latest: latestResults, history: resultsHistory } = await getLatestResultsReport();
  const legacySectorDecisions =
    latest.legacySectorDecisions?.length
      ? latest.legacySectorDecisions
      : buildLegacySectorDecisions(latest, history, [latestResults, ...resultsHistory]);
  const resultsLessons = [
    ...latestResults.nextWeekFocus.map((item) => ({ label: "포커스", text: item })),
    ...latestResults.processTakeaways.map((item) => ({ label: "교훈", text: item })),
  ].slice(0, 5);
  const promisingPreviousRanks = new Map(
    previousDay?.promisingSectors.map((sector) => [sector.sectorName, sector.rank]) ?? [],
  );
  const cautionPreviousRanks = new Map(
    previousDay?.cautionSectors.map((sector) => [sector.sectorName, sector.rank]) ?? [],
  );
  const rawBuyCandidates = [
    ...latest.promisingSectors.flatMap((sector) =>
      sector.stocks
        .filter((stock) => resolveStockActionBias(stock) === "buy")
        .map((stock) => ({
          key: `stock-${sector.market}-${sector.sectorName}-${stock.ticker}`,
          ticker: stock.ticker,
          companyName: stock.companyName,
          market: stock.market,
          sector: sector.sectorName,
          actionBias: resolveStockActionBias(stock),
          timeHorizon: stock.timeHorizon,
          rationale: stock.rationale,
          stockThesis: stock.thesis,
          positioningNote: stock.positioningNote,
          invalidation: stock.invalidation,
          alreadyPriced: stock.alreadyPriced,
          watchDate: stock.watchDate,
          watchCondition: stock.watchCondition,
          confidenceReason: stock.confidenceReason,
          priceSnapshot: stock.priceSnapshot,
          confidenceLevel: stock.confidenceLevel,
          snapshotHealth: stock.snapshotHealth,
          thesis: sector.thesis,
          keyDrivers: sector.keyDrivers ?? [],
          valuationNote: undefined,
          liquidityNote: undefined,
          catalysts: [stock.catalyst, ...(stock.catalysts ?? [])].filter((item): item is string => Boolean(item)),
          risks: [...(stock.risks ?? []), ...(sector.risks ?? sector.headwinds ?? [])],
        })),
    ),
    ...(latest.smallCapIdeas ?? [])
      .filter((idea) => resolveSmallCapActionBias(idea) === "buy")
      .map((idea) => ({
        key: `smallcap-${idea.market}-${idea.ticker}`,
        ticker: idea.ticker,
        companyName: idea.companyName,
        market: idea.market,
        sector: idea.sector,
        actionBias: resolveSmallCapActionBias(idea),
        timeHorizon: idea.timeHorizon,
        rationale: idea.whyNow,
        stockThesis: idea.thesis,
        positioningNote: idea.positioningNote,
        invalidation: idea.invalidation,
        alreadyPriced: idea.alreadyPriced,
        watchDate: idea.watchDate,
        watchCondition: idea.watchCondition,
        confidenceReason: idea.confidenceReason,
        priceSnapshot: idea.priceSnapshot,
        confidenceLevel: idea.confidenceLevel,
        snapshotHealth: idea.snapshotHealth,
        thesis: idea.thesis,
        keyDrivers: [idea.followThroughNote].filter((item): item is string => Boolean(item)),
        valuationNote: idea.valuationNote,
        liquidityNote: idea.liquidityNote,
        catalysts: idea.catalysts ?? [],
        risks: idea.risks ?? [],
      })),
  ];
  const buyCandidates = Array.from(
    new Map(rawBuyCandidates.map((candidate) => [`${candidate.market}-${candidate.ticker}`, candidate])).values(),
  ).slice(0, 8);
  const rawRiskCandidates: DashboardActionCandidate[] = latest.cautionSectors.flatMap((sector) =>
    sector.stocks
      .filter((stock) => {
        const actionBias = resolveStockActionBias(stock);
        return actionBias === "reduce" || actionBias === "exit";
      })
      .map((stock) => ({
        key: `risk-${sector.market}-${sector.sectorName}-${stock.ticker}`,
        ticker: stock.ticker,
        companyName: stock.companyName,
        market: stock.market,
        sector: sector.sectorName,
        actionBias: resolveStockActionBias(stock),
        timeHorizon: stock.timeHorizon,
        rationale: stock.rationale,
        positioningNote: stock.positioningNote,
        invalidation: stock.invalidation,
        priceSnapshot: stock.priceSnapshot,
        snapshotHealth: stock.snapshotHealth,
      })),
  );
  const riskCandidates = Array.from(
    new Map(rawRiskCandidates.map((candidate) => [`${candidate.market}-${candidate.ticker}`, candidate])).values(),
  ).slice(0, 8);

  return (
    <main className="dashboard-shell">
      <MarketRegimeConsole latest={latest} />

      <RegimeChangePanel latest={latest} previousDay={previousDay} />
      <RotationMap latest={latest} />
      <ActionCommandPanel latest={latest} buyCandidates={buyCandidates} riskCandidates={riskCandidates} />
      <ThemeRadarPanel themes={latest.themeRadar} />
      <ResearchOpportunities candidates={buyCandidates} />
      <RiskRadar latest={latest} />
      <TrackRecordPreview report={latestResults} history={resultsHistory} />
      <ResearchMethodology latest={latest} />

      <details className="group mt-4 rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-panel">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Supporting Detail Archive</h2>
            <p className="section-caption">섹터 카드, 원문 근거, 체크포인트, 중소형주, 7일 트렌드는 보조 자료로 접어둡니다.</p>
          </div>
          <Badge variant="neutral">펼치기</Badge>
        </summary>

        <div className="mt-6">
          <section>
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

      {resultsLessons.length ? (
        <section className="mt-4 rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                <CheckCircle2 className="size-4" />
                최근 Results 교훈
              </div>
              <p className="mt-2 text-sm text-slate-500">{latestResults.evaluationWindow.label}</p>
            </div>
            <Badge variant="neutral">{latestResults.scorecard.evaluatedCount}개 평가</Badge>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            {resultsLessons.map((item, index) => (
              <div key={`results-lesson-${index}`} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                <Badge variant={item.label === "포커스" ? "positive" : "neutral"}>{item.label}</Badge>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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

      <AnalysisSuggestionPanel suggestions={legacySectorDecisions} />

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
        </div>
      </details>
    </main>
  );
}
