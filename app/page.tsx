import { Activity, AlertCircle, BarChart3, CheckCircle2, RefreshCw, Shield } from "lucide-react";

import { AnalysisSuggestionPanel } from "@/components/analysis-suggestion-panel";
import { ChangeList } from "@/components/change-list";
import { CheckpointList } from "@/components/checkpoint-list";
import { ReasonPanel } from "@/components/reason-panel";
import { SectorCard } from "@/components/sector-card";
import { SmallCapPanel } from "@/components/small-cap-panel";
import { SummaryCard } from "@/components/summary-card";
import { TrendPanel } from "@/components/trend-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildLegacySectorDecisions, getLatestAnalysis, getLatestResultsReport, formatTimestamp } from "@/lib/dashboard";
import { withBasePath } from "@/lib/site";
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

function actionBiasLabel(actionBias: ActionBias) {
  if (actionBias === "buy") return "매수";
  if (actionBias === "hold") return "유지";
  if (actionBias === "reduce") return "축소";
  return "정리";
}

function timeHorizonLabel(value?: StockIdea["timeHorizon"] | SmallCapIdea["timeHorizon"]) {
  if (value === "1-3d") return "1-3일";
  if (value === "1-3m") return "1-3개월";
  return "1-3주";
}

function formatPrice(value?: number, market?: StockIdea["market"] | SmallCapIdea["market"], currency?: "KRW" | "USD") {
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

function formatRelativeToHigh(current?: number, high?: number) {
  if (typeof current !== "number" || typeof high !== "number" || high <= 0) {
    return "업데이트 예정";
  }

  const value = (current / high - 1) * 100;
  return `${value.toFixed(1)}%`;
}

function formatRangePosition(current?: number, low?: number, high?: number) {
  if (
    typeof current !== "number" ||
    typeof low !== "number" ||
    typeof high !== "number" ||
    high <= low
  ) {
    return "업데이트 예정";
  }

  const position = Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));
  return `${position.toFixed(0)}%`;
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
          positioningNote: stock.positioningNote,
          invalidation: stock.invalidation,
          priceSnapshot: stock.priceSnapshot,
          confidenceLevel: stock.confidenceLevel,
          snapshotHealth: stock.snapshotHealth,
          thesis: sector.thesis,
          keyDrivers: sector.keyDrivers ?? [],
          valuationNote: undefined,
          liquidityNote: undefined,
          catalysts: [],
          risks: sector.risks ?? sector.headwinds ?? [],
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
        positioningNote: idea.positioningNote,
        invalidation: idea.invalidation,
        priceSnapshot: idea.priceSnapshot,
        confidenceLevel: idea.confidenceLevel,
        snapshotHealth: idea.snapshotHealth,
        thesis: idea.thesis,
        keyDrivers: [idea.followThroughNote].filter(Boolean),
        valuationNote: idea.valuationNote,
        liquidityNote: idea.liquidityNote,
        catalysts: idea.catalysts ?? [],
        risks: idea.risks ?? [],
      })),
  ];
  const buyCandidates = Array.from(
    new Map(rawBuyCandidates.map((candidate) => [`${candidate.market}-${candidate.ticker}`, candidate])).values(),
  ).slice(0, 8);

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

      <section className="mt-4 rounded-[1.75rem] border border-emerald-100 bg-emerald-50/70 p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              <Activity className="size-4" />
              매수 후보
            </div>
            <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
              오늘 바로 검토할 후보 {buyCandidates.length}개
            </p>
          </div>
          <Badge variant="positive">actionBias=buy</Badge>
        </div>
        {buyCandidates.length ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-2 2xl:grid-cols-4">
            {buyCandidates.map((candidate) => {
              const snapshot = candidate.priceSnapshot;
              const changePct = snapshot?.previousCloseChangePct;
              const changeTone =
                typeof changePct === "number" && changePct > 0
                  ? "text-emerald-700"
                  : typeof changePct === "number" && changePct < 0
                    ? "text-rose-700"
                    : "text-slate-600";

              return (
              <div key={candidate.key} className="rounded-2xl border border-emerald-100 bg-white/90 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="positive">{actionBiasLabel(candidate.actionBias)}</Badge>
                  <Badge variant="neutral">{candidate.market}</Badge>
                  <Badge variant="neutral">{timeHorizonLabel(candidate.timeHorizon)}</Badge>
                  {candidate.snapshotHealth ? <Badge variant="neutral">{candidate.snapshotHealth}</Badge> : null}
                </div>
                <p className="text-sm font-semibold tracking-[0.16em] text-slate-900">{candidate.ticker}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{candidate.companyName}</p>
                <p className="mt-2 text-xs text-slate-500">{candidate.sector}</p>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">현재가</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">
                        {formatPrice(snapshot?.currentPrice, candidate.market, snapshot?.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">전일대비</p>
                      <p className={`mt-1 text-sm font-semibold ${changeTone}`}>{formatPercent(changePct)}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-slate-500">52주 고점</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatPrice(snapshot?.week52High, candidate.market, snapshot?.currency)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-slate-500">고점 대비</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatRelativeToHigh(snapshot?.currentPrice, snapshot?.week52High)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-slate-500">52주 저점</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatPrice(snapshot?.week52Low, candidate.market, snapshot?.currency)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-slate-500">52주 위치</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatRangePosition(snapshot?.currentPrice, snapshot?.week52Low, snapshot?.week52High)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    가격 기준일: {snapshot?.priceDate ?? "업데이트 예정"}
                  </p>
                </div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">매수 논리</p>
                    <p className="mt-1">{candidate.rationale}</p>
                  </div>
                  {candidate.thesis ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">상위 논리</p>
                      <p className="mt-1">{candidate.thesis}</p>
                    </div>
                  ) : null}
                  {candidate.keyDrivers.length ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">핵심 동인</p>
                      <ul className="mt-1 space-y-1">
                        {candidate.keyDrivers.slice(0, 2).map((driver, index) => (
                          <li key={`driver-${candidate.key}-${index}`}>- {driver}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {candidate.valuationNote || candidate.liquidityNote ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {candidate.valuationNote ? (
                        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
                          <span className="font-semibold">밸류/가격: </span>
                          {candidate.valuationNote}
                        </div>
                      ) : null}
                      {candidate.liquidityNote ? (
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                          <span className="font-semibold">유동성: </span>
                          {candidate.liquidityNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {candidate.catalysts.length ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">촉매</p>
                      <p className="mt-1">{candidate.catalysts.slice(0, 2).join(" / ")}</p>
                    </div>
                  ) : null}
                  {candidate.positioningNote ? (
                    <div className="rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-700">
                      <span className="font-semibold text-slate-900">진입 메모: </span>
                      {candidate.positioningNote}
                    </div>
                  ) : null}
                  {candidate.risks.length ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-600">주요 리스크</p>
                      <p className="mt-1">{candidate.risks.slice(0, 2).join(" / ")}</p>
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  무효화: {candidate.invalidation ?? "가격, 수급, 실적 논리가 깨지면 제외"}
                </p>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-white/80 p-4 text-sm text-slate-600">
            이번 JSON에는 `actionBias=buy` 후보가 없습니다. 다음 A1 실행부터 최소 후보 발굴 규칙을 적용합니다.
          </div>
        )}
      </section>

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
    </main>
  );
}
