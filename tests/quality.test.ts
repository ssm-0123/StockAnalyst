import test from "node:test";
import assert from "node:assert/strict";

import { normalizeDailyAnalysis, normalizeWeeklyResultsReport } from "../lib/data-normalizers.ts";
import { selectLatestEntriesPerDate } from "../lib/dashboard.ts";
import { assessPriceSnapshot, enrichDailyAnalysis, enrichWeeklyResultsReport } from "../lib/quality.ts";

test("assessPriceSnapshot marks stale snapshots", () => {
  const result = assessPriceSnapshot(
    {
      priceDate: "2026-04-10",
      currentPrice: 100,
      previousCloseChangePct: 1.2,
      week52High: 120,
      week52Low: 80,
      currency: "USD",
    },
    "2026-04-24",
  );

  assert.equal(result.health, "stale");
  assert.ok(result.issues.some((issue) => issue.code === "stale-snapshot"));
});

test("assessPriceSnapshot marks missing snapshot", () => {
  const result = assessPriceSnapshot(undefined, "2026-04-24");

  assert.equal(result.health, "missing");
  assert.ok(result.issues.some((issue) => issue.code === "missing-snapshot"));
});

test("assessPriceSnapshot marks extreme move invalid", () => {
  const result = assessPriceSnapshot(
    {
      priceDate: "2026-04-24",
      currentPrice: 100,
      previousCloseChangePct: 55,
      week52High: 110,
      week52Low: 70,
      currency: "USD",
    },
    "2026-04-24",
  );

  assert.equal(result.health, "invalid");
  assert.ok(result.issues.some((issue) => issue.code === "extreme-daily-move"));
});

test("selectLatestEntriesPerDate keeps latest snapshot for each date", () => {
  const first = normalizeDailyAnalysis({
    date: "2026-04-22",
    lastUpdated: "2026-04-22T08:00:00Z",
  });
  const second = normalizeDailyAnalysis({
    date: "2026-04-22",
    lastUpdated: "2026-04-22T10:00:00Z",
    topOpportunity: "newer",
  });
  const third = normalizeDailyAnalysis({
    date: "2026-04-21",
    lastUpdated: "2026-04-21T09:00:00Z",
  });

  const selected = selectLatestEntriesPerDate([first, second, third]);

  assert.equal(selected.length, 2);
  assert.equal(selected[0].lastUpdated, "2026-04-22T10:00:00Z");
});

test("enrichDailyAnalysis summarizes validation health", () => {
  const analysis = normalizeDailyAnalysis({
    date: "2026-04-24",
    lastUpdated: "2026-04-24T09:00:00Z",
    promisingSectors: [
      {
        sectorName: "반도체",
        market: "KR",
        rank: 1,
        confidenceScore: 82,
        thesis: "테스트",
        stocks: [
          {
            ticker: "005930",
            companyName: "삼성전자",
            market: "KR",
            rationale: "현재가와 52주 범위가 모두 확인된 대표 반도체주다.",
            change: "hold",
            priceSnapshot: {
              priceDate: "2026-04-24",
              currentPrice: 100,
              previousCloseChangePct: 1,
              week52High: 110,
              week52Low: 80,
              currency: "KRW",
            },
          },
        ],
      },
    ],
    cautionSectors: [
      {
        sectorName: "항공",
        market: "US",
        rank: 1,
        confidenceScore: 70,
        thesis: "테스트",
        stocks: [
          {
            ticker: "UAL",
            companyName: "유나이티드항공",
            market: "US",
            rationale: "가격 확인이 늦었다.",
            change: "downgrade",
            priceSnapshot: {
              priceDate: "2026-04-10",
              currentPrice: 100,
              previousCloseChangePct: 1,
              week52High: 120,
              week52Low: 70,
              currency: "USD",
            },
          },
        ],
      },
    ],
    smallCapIdeas: [
      {
        rank: 1,
        ticker: "005850",
        companyName: "에스엘",
        market: "KR",
        sector: "자동차부품",
        theme: "테스트",
        thesis: "논리는 있지만 가격이 비어 있다.",
        whyNow: "수급만 확인",
        valuationNote: "밸류",
        liquidityNote: "유동성",
        catalysts: ["실적"],
        risks: ["변동성"],
      },
    ],
  });

  const enriched = enrichDailyAnalysis(analysis);

  assert.equal(enriched.validationSummary?.totalIdeas, 3);
  assert.equal(enriched.validationSummary?.freshSnapshots, 1);
  assert.equal(enriched.validationSummary?.staleSnapshots, 1);
  assert.equal(enriched.validationSummary?.incompleteSnapshots, 1);
});

test("enrichWeeklyResultsReport fills benchmark labels and confidence", () => {
  const report = normalizeWeeklyResultsReport({
    reportDate: "2026-04-26",
    lastUpdated: "2026-04-26T10:00:00Z",
    evaluationWindow: {
      startDate: "2026-04-20",
      endDate: "2026-04-26",
      label: "테스트",
    },
    evaluatedInsights: [
      {
        ticker: "ORCL",
        companyName: "오라클",
        market: "US",
        sector: "AI 인프라",
        stance: "promising",
        entryDate: "2026-04-20",
        evaluationDate: "2026-04-26",
        holdingPeriodDays: 5,
        thesis: "테스트",
        priceReturnPct: 3,
        benchmarkReturnPct: 1,
        callAlphaPct: 2,
        verdict: "worked",
        priceEvidence: "snapshot",
        dataQuality: "verified",
        outcomeSummary: "잘 됨",
        lesson: "유지",
      },
      {
        ticker: "005850",
        companyName: "에스엘",
        market: "KR",
        sector: "자동차부품",
        stance: "small-cap",
        entryDate: "2026-04-20",
        evaluationDate: "2026-04-26",
        holdingPeriodDays: 5,
        thesis: "테스트",
        priceReturnPct: 2,
        benchmarkReturnPct: 0.5,
        callAlphaPct: 1.5,
        verdict: "mixed",
        priceEvidence: "fallback",
        dataQuality: "limited",
        outcomeSummary: "보통",
        lesson: "보수적",
      },
    ],
  });

  const enriched = enrichWeeklyResultsReport(report);

  assert.equal(enriched.evaluatedInsights[0].benchmarkLabel, "US AI 인프라 대형주 관찰군");
  assert.equal(enriched.evaluatedInsights[0].confidenceLevel, "high");
  assert.equal(enriched.evaluatedInsights[1].benchmarkLabel, "KR 중소형 관찰군");
  assert.equal(enriched.evaluatedInsights[1].confidenceLevel, "low");
});
