import { ArrowRight, Gauge, MoveRight, Radar, Target } from "lucide-react";

import type { DashboardActionCandidate } from "@/components/action-command-panel";
import { TermHint } from "@/components/term-hint";
import { Badge } from "@/components/ui/badge";
import { buildForwardConfidence } from "@/lib/research-confidence";
import { withBasePath } from "@/lib/site";
import type { ConfidenceLevel, DailyAnalysis, EntryQuality, MarketCode } from "@/lib/types";

type NextCycleStock = {
  ticker: string;
  companyName: string;
  market: MarketCode;
  confidenceLevel?: ConfidenceLevel;
  entryQuality?: EntryQuality;
  reason?: string;
};

type NextCycleRow = {
  from: string;
  to: string;
  condition?: string;
  risk?: string;
  stocks: NextCycleStock[];
};

function splitLabel(value: string) {
  return value.includes("|") ? value.split("|").map((part) => part.trim()).filter(Boolean).at(-1) ?? value : value;
}

function compactLabel(value: string) {
  const label = splitLabel(value).replace(/^(KR|US)\s+/, "").trim();
  const rules: Array<[RegExp, string]> = [
    [/조선\/방산|KDDX|캐나다 방산/, "KDDX/방산"],
    [/후공정|검사장비/, "후공정 검사장비"],
    [/전력 인프라|전력 품질|전력 장비|데이터센터 capex/i, "AI 전력 인프라"],
    [/AI 반도체|반도체\/네트워킹|HBM 대형주|반도체 ETF/i, "AI/HBM 리더"],
    [/고베타 원전|데이터센터 옵션/i, "고베타 원전/데이터센터"],
    [/현금성 대기|충격 후 현금성/, "현금성 대기"],
    [/SaaS|데이터 구독/i, "SaaS/데이터 구독"],
    [/항공|온라인 여행/, "항공/여행"],
    [/Jensen Huang|physical AI/i, "Physical AI 협력"],
    [/미국 고용|AI 리더 재가격/, "AI 리더 재가격"],
  ];
  const matched = rules.find(([pattern]) => pattern.test(label));
  if (matched) return matched[1];
  return label;
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => compactLabel(item).trim()).filter(Boolean)));
}

function sentence(value?: string) {
  return value?.split(/(?<=[.!?。]|[다요]\.)\s+/).find(Boolean)?.trim() ?? "";
}

function viewBuckets(latest: DailyAnalysis) {
  const rotations = unique(latest.marketRegime?.nextRotation ?? []);
  const promising = unique(latest.promisingSectors.map((sector) => sector.sectorName));
  const favor = unique([...rotations, ...promising]).slice(0, 3);
  const neutral = unique(
    latest.themeRadar
      ?.filter((theme) => theme.tradability === "wait_for_confirmation" || theme.tradability === "watch_after_spike")
      .map((theme) => theme.theme) ?? [],
  ).slice(0, 2);
  const avoid = unique([
    ...latest.cautionSectors.map((sector) => sector.sectorName),
    ...(latest.themeRadar
      ?.filter((theme) => theme.tradability === "avoid_chase")
      .map((theme) => theme.theme) ?? []),
  ]).slice(0, 3);

  return {
    favor,
    neutral: neutral.length ? neutral : ["확인 대기 테마"],
    avoid,
  };
}

function rationale(latest: DailyAnalysis) {
  const regime = latest.marketRegime;
  const topSector = latest.promisingSectors[0];
  const topTheme = latest.themeRadar?.[0];
  return [
    sentence(regime?.summary),
    sentence(topSector?.thesis),
    sentence(topTheme?.marketReaction || topTheme?.narrative),
  ]
    .filter(Boolean)
    .slice(0, 3);
}

function moneyFlows(latest: DailyAnalysis) {
  const caution = latest.cautionSectors.map((sector) => sector.sectorName);
  const rotations = latest.marketRegime?.nextRotation ?? [];
  const current = latest.promisingSectors.map((sector) => sector.sectorName);
  const flows = [
    [caution[0], rotations[0]],
    [current[0], rotations[1] ?? rotations[0]],
    [caution[1], rotations[2] ?? current[1]],
  ].filter(([from, to]) => from && to && from !== to);

  return flows.slice(0, 3);
}

function normalizeForMatch(value: string) {
  return splitLabel(value)
    .replace(/^(KR|US|GLOBAL)\s+/i, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

function labelMatches(a?: string, b?: string) {
  if (!a || !b) return false;
  const left = normalizeForMatch(a);
  const right = normalizeForMatch(b);
  if (!left || !right) return false;
  if (left.includes(right) || right.includes(left)) return true;

  const stopWords = new Set(["kr", "us", "global", "에서", "으로", "이후", "추격", "회전", "후보", "기준선", "대표주"]);
  const tokenize = (value: string) =>
    Array.from(new Set(splitLabel(value).match(/[\p{L}\p{N}]+/gu) ?? []))
      .map((token) => token.toLowerCase())
      .filter((token) => token.length >= 2 && !stopWords.has(token));
  const leftTokens = tokenize(a);
  const rightTokens = tokenize(b);
  const overlap = leftTokens.filter((token) => rightTokens.includes(token));
  return overlap.some((token) => token.length >= 3) || overlap.length >= 2;
}

function recommendedForCycleLabel(
  label: string,
  latest: DailyAnalysis,
  buyCandidates: DashboardActionCandidate[],
) {
  const directCandidates = buyCandidates.filter(
    (candidate) => labelMatches(candidate.sector, label) || labelMatches(candidate.thesis, label) || labelMatches(candidate.rationale, label),
  );

  const sectorStocks = latest.promisingSectors
    .filter((sector) => labelMatches(sector.sectorName, label) || labelMatches(sector.thesis, label))
    .flatMap((sector) =>
      sector.stocks.map((stock) => ({
        ticker: stock.ticker,
        companyName: stock.companyName,
        market: stock.market,
        confidenceLevel: stock.confidenceLevel,
        entryQuality: stock.entryQuality,
      })),
    );

  const themeStocks =
    latest.themeRadar
      ?.filter((theme) => labelMatches(theme.theme, label) || labelMatches(theme.narrative, label) || labelMatches(theme.marketReaction, label))
      .flatMap((theme) =>
        theme.affectedStocks.map((stock) => ({
          ticker: stock.ticker,
          companyName: stock.companyName,
          market: stock.market,
          confidenceLevel: stock.confidenceLevel,
          entryQuality: stock.entryQuality,
        })),
      ) ?? [];

  const merged = [
    ...directCandidates.map((candidate) => ({
      ticker: candidate.ticker,
      companyName: candidate.companyName,
      market: candidate.market,
      confidenceLevel: candidate.confidenceLevel,
      entryQuality: candidate.entryQuality,
    })),
    ...sectorStocks,
    ...themeStocks,
  ];

  return Array.from(new Map(merged.map((stock) => [`${stock.market}-${stock.ticker}`, stock])).values()).slice(0, 3);
}

function cycleRows(latest: DailyAnalysis, buyCandidates: DashboardActionCandidate[]): NextCycleRow[] {
  if (latest.nextCycle?.length) {
    return latest.nextCycle
      .filter((row) => row.to)
      .slice(0, 3)
      .map((row) => ({
        from: row.from,
        to: row.to,
        condition: row.condition,
        risk: row.risk,
        stocks: (row.stocks ?? [])
          .filter((stock) => stock.ticker)
          .map((stock) => ({
            ticker: stock.ticker,
            companyName: stock.companyName ?? "종목명 확인 필요",
            market: stock.market ?? "GLOBAL",
            reason: stock.reason,
          })),
      }));
  }

  const flows = moneyFlows(latest);
  const rotations = unique(latest.marketRegime?.nextRotation ?? []);
  const rows = flows.length
    ? flows.map(([from, to]) => ({ from, to }))
    : rotations.slice(0, 3).map((to, index) => ({
        from: index === 0 ? "현재 주도주" : "기존 관심 영역",
        to,
      }));

  return rows
    .filter((row) => row.to)
    .slice(0, 3)
    .map((row) => ({
      ...row,
      stocks: recommendedForCycleLabel(row.to, latest, buyCandidates).map((stock) => ({
        ticker: stock.ticker,
        companyName: stock.companyName,
        market: stock.market,
        confidenceLevel: stock.confidenceLevel,
        entryQuality: stock.entryQuality,
      })),
    }));
}

function primaryTicker(candidate?: DashboardActionCandidate) {
  if (!candidate) return "후보 확인 중";
  return `${candidate.ticker} · ${candidate.companyName}`;
}

function compactSentence(value?: string, maxLength = 140) {
  const text = sentence(value) || value || "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function topLine(latest: DailyAnalysis) {
  return compactSentence(latest.topOpportunity || latest.marketRegime?.summary || latest.promisingSectors[0]?.thesis);
}

function formatKstDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function DecisionTile({
  label,
  title,
  body,
  tone,
}: {
  label: string;
  title: string;
  body: string;
  tone: "positive" | "neutral" | "caution" | "accent";
}) {
  const toneClass = {
    positive: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    caution: "border-rose-200 bg-rose-50/80 text-rose-800",
    accent: "border-cyan-200 bg-cyan-50/80 text-cyan-800",
  }[tone];

  return (
    <div className={`min-w-0 rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-75">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-5">{title}</p>
      <p className="mt-1 hidden break-words text-xs leading-5 opacity-80 sm:block">{body}</p>
    </div>
  );
}

function stockLabel(stock: NextCycleStock) {
  return `${stock.ticker} · ${stock.companyName}`;
}

function NextCyclePanel({
  rows,
}: {
  rows: ReturnType<typeof cycleRows>;
}) {
  if (!rows.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <MoveRight className="size-4" />
          Next Cycle
        </div>
        <Badge variant="accent">섹터 → 종목</Badge>
      </div>
      <div className="mt-3 sm:hidden">
        {rows.slice(0, 1).map((row, index) => (
          <div key={`mobile-${row.from}-${row.to}-${index}`} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="break-words text-xs text-slate-500">{compactLabel(row.from)}</span>
              <ArrowRight className="size-4 shrink-0 text-slate-400" />
              <span className="break-words">{compactLabel(row.to)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.stocks.length ? (
                row.stocks.slice(0, 2).map((stock) => (
                  <Badge key={`mobile-${row.to}-${stock.market}-${stock.ticker}`} variant="neutral" className="max-w-full whitespace-normal break-words text-left leading-4">
                    {stockLabel(stock)}
                  </Badge>
                ))
              ) : (
                <Badge variant="neutral">종목 후보 확인 필요</Badge>
              )}
            </div>
            {row.condition || row.risk ? (
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {row.condition ? `조건: ${row.condition}` : ""}
                {row.condition && row.risk ? " / " : ""}
                {row.risk ? `리스크: ${row.risk}` : ""}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3 hidden gap-2 sm:grid lg:grid-cols-3">
        {rows.map((row, index) => (
          <div key={`${row.from}-${row.to}-${index}`} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="break-words text-xs text-slate-500">{compactLabel(row.from)}</span>
              <ArrowRight className="size-4 shrink-0 text-slate-400" />
              <span className="break-words">{compactLabel(row.to)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.stocks.length ? (
                row.stocks.slice(0, 2).map((stock) => (
                  <Badge key={`${row.to}-${stock.market}-${stock.ticker}`} variant="neutral" className="max-w-full whitespace-normal break-words text-left leading-4">
                    {stockLabel(stock)}
                  </Badge>
                ))
              ) : (
                <Badge variant="neutral">종목 후보 확인 필요</Badge>
              )}
            </div>
            {row.condition || row.risk ? (
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {row.condition ? `조건: ${row.condition}` : ""}
                {row.condition && row.risk ? " / " : ""}
                {row.risk ? `리스크: ${row.risk}` : ""}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ForwardViewPanel({
  latest,
  buyCandidates = [],
  riskCandidates = [],
}: {
  latest: DailyAnalysis;
  buyCandidates?: DashboardActionCandidate[];
  riskCandidates?: DashboardActionCandidate[];
}) {
  const buckets = viewBuckets(latest);
  const confidence = buildForwardConfidence(latest);
  const nextCycleRows = cycleRows(latest, buyCandidates);
  const focus = buyCandidates[0];
  const risk = riskCandidates[0];
  const monitorTheme =
    latest.themeRadar?.find((theme) => theme.tradability === "wait_for_confirmation") ?? latest.themeRadar?.[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
      <div className="border-b border-slate-200 bg-slate-950 px-4 py-3 text-white sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="positive">Forward View</Badge>
            <Badge variant="neutral" className="border-white/10 bg-white/10 text-slate-200">
              Next 1-2 Weeks
            </Badge>
            <Badge variant="neutral" className="border-white/10 bg-white/10 text-slate-200">
              {latest.date}
            </Badge>
            <Badge variant="neutral" className="border-white/10 bg-white/10 text-slate-200">
              기준 {formatKstDateTime(latest.lastUpdated)} KST
            </Badge>
          </div>
          <a
            href={withBasePath("/Results")}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/15"
          >
            판단 결과
          </a>
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <Radar className="size-4" />
            AI Market Intelligence
          </div>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            그래서 지금 시장을 어떻게 봐야 하는가
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{topLine(latest)}</p>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <DecisionTile
              label="Favor"
              title={buckets.favor[0] ?? "우위 영역 없음"}
              body={focus ? primaryTicker(focus) : compactSentence(latest.topOpportunity, 72)}
              tone="positive"
            />
            <DecisionTile
              label="Watch"
              title={monitorTheme?.theme ?? buckets.neutral[0] ?? "확인 대기"}
              body={compactSentence(monitorTheme?.whatToWatch ?? monitorTheme?.marketReaction ?? "후속 확인 조건을 봅니다.", 72)}
              tone="accent"
            />
            <DecisionTile
              label="Avoid"
              title={risk ? primaryTicker(risk) : buckets.avoid[0] ?? "명확한 회피 없음"}
              body={compactSentence(risk?.rationale ?? latest.topRisk, 72)}
              tone="caution"
            />
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start gap-2">
              <Target className="mt-0.5 size-4 shrink-0 text-slate-500" />
              <p className="text-sm leading-6 text-slate-700">
                <span className="font-semibold text-slate-950">핵심 리스크: </span>
                {latest.topRisk}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <Gauge className="size-4" />
                  <TermHint
                    label="판단 신뢰도"
                    description="근거의 신선도, 국면 점수, 테마 강도를 종합한 리서치 확신도입니다. 맞을 확률이나 매수 지시는 아닙니다."
                  />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold text-slate-950">{confidence.score}%</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">{confidence.label}</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${confidence.score}%` }} />
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                + {confidence.positives.join(" · ") || "강한 가산 요인 없음"}
                {confidence.negatives.length ? ` / - ${confidence.negatives.join(" · ")}` : ""}
              </p>
            </div>
          </div>

          <NextCyclePanel rows={nextCycleRows} />
        </div>
      </div>
    </section>
  );
}
