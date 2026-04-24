import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { normalizeDailyAnalysis, normalizeWeeklyResultsReport } from "../lib/data-normalizers";
import { enrichDailyAnalysis, enrichWeeklyResultsReport } from "../lib/quality";
import { ValidationIssue, ValidationSummary } from "../lib/types";

type CheckResult = {
  label: string;
  filePath: string;
  summary: ValidationSummary;
  issues: Array<{
    scope: string;
    ticker?: string;
    companyName?: string;
    issue: ValidationIssue;
  }>;
};

type CliOptions = {
  strict: boolean;
  json: boolean;
};

const rootDir = process.cwd();

async function readJsonFile(filePath: string) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as unknown;
}

function freshRatio(summary: ValidationSummary) {
  if (summary.totalIdeas === 0) {
    return 0;
  }

  return summary.freshSnapshots / summary.totalIdeas;
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatSummary(summary: ValidationSummary) {
  return [
    `total=${summary.totalIdeas}`,
    `fresh=${summary.freshSnapshots}`,
    `stale=${summary.staleSnapshots}`,
    `incomplete=${summary.incompleteSnapshots}`,
    `invalid=${summary.invalidSnapshots}`,
    `highConfidence=${summary.highConfidenceIdeas}`,
    `freshRatio=${pct(freshRatio(summary))}`,
  ].join(" ");
}

function shouldFailDaily(summary: ValidationSummary, strict: boolean) {
  if (summary.invalidSnapshots > 0) {
    return true;
  }

  if (!strict) {
    return false;
  }

  return summary.totalIdeas > 0 && freshRatio(summary) < 0.8;
}

function shouldFailResults(summary: ValidationSummary, strict: boolean) {
  if (!strict) {
    return false;
  }

  return summary.totalIdeas > 0 && freshRatio(summary) < 0.6;
}

async function checkDailyData(): Promise<CheckResult> {
  const filePath = path.join(rootDir, "public", "data", "latest.json");
  const analysis = enrichDailyAnalysis(normalizeDailyAnalysis(await readJsonFile(filePath)));
  const issues: CheckResult["issues"] = [];

  for (const sector of [...analysis.promisingSectors, ...analysis.cautionSectors]) {
    for (const stock of sector.stocks) {
      for (const issue of stock.validationIssues ?? []) {
        issues.push({
          scope: `${sector.market} ${sector.sectorName}`,
          ticker: stock.ticker,
          companyName: stock.companyName,
          issue,
        });
      }
    }
  }

  for (const idea of analysis.smallCapIdeas ?? []) {
    for (const issue of idea.validationIssues ?? []) {
      issues.push({
        scope: `${idea.market} small-cap ${idea.sector}`,
        ticker: idea.ticker,
        companyName: idea.companyName,
        issue,
      });
    }
  }

  return {
    label: "daily",
    filePath,
    summary: analysis.validationSummary!,
    issues,
  };
}

async function checkResultsData(): Promise<CheckResult> {
  const filePath = path.join(rootDir, "public", "data", "results", "latest.json");
  const report = enrichWeeklyResultsReport(normalizeWeeklyResultsReport(await readJsonFile(filePath)));
  const issues: CheckResult["issues"] = [];

  for (const item of report.evaluatedInsights) {
    if (item.dataQuality !== "verified") {
      issues.push({
        scope: `${item.market} ${item.stance} ${item.sector}`,
        ticker: item.ticker,
        companyName: item.companyName,
        issue: {
          code: `results-${item.dataQuality}`,
          label: item.dataQuality,
          severity: item.dataQuality === "stale-excluded" ? "warning" : "info",
          detail: `Results item uses ${item.dataQuality} data quality with ${item.priceEvidence} price evidence.`,
        },
      });
    }

    if (item.priceEvidence === "fallback") {
      issues.push({
        scope: `${item.market} ${item.stance} ${item.sector}`,
        ticker: item.ticker,
        companyName: item.companyName,
        issue: {
          code: "results-fallback-price",
          label: "fallback",
          severity: "info",
          detail: "Results item uses fallback price evidence instead of saved snapshot evidence.",
        },
      });
    }
  }

  return {
    label: "results",
    filePath,
    summary: report.validationSummary!,
    issues,
  };
}

function parseOptions(argv: string[]): CliOptions {
  return {
    strict: argv.includes("--strict"),
    json: argv.includes("--json"),
  };
}

function printText(results: CheckResult[], strict: boolean) {
  for (const result of results) {
    console.log(`[${result.label}] ${formatSummary(result.summary)}`);
    console.log(`  ${result.summary.summary}`);

    for (const item of result.issues.slice(0, 12)) {
      const name = item.ticker ? `${item.ticker} ${item.companyName ?? ""}`.trim() : item.scope;
      console.log(`  - ${item.issue.severity}: ${name} | ${item.issue.label} | ${item.issue.detail}`);
    }

    if (result.issues.length > 12) {
      console.log(`  - ... ${result.issues.length - 12} more issue(s)`);
    }
  }

  if (strict) {
    console.log("[strict] daily requires no invalid snapshots and at least 80% fresh snapshots.");
    console.log("[strict] results requires at least 60% verified snapshot-quality evidence.");
  }
}

export async function runDataQualityCheck(options: CliOptions) {
  const results = await Promise.all([checkDailyData(), checkResultsData()]);
  const failed =
    shouldFailDaily(results[0].summary, options.strict) || shouldFailResults(results[1].summary, options.strict);

  if (options.json) {
    console.log(JSON.stringify({ failed, strict: options.strict, results }, null, 2));
  } else {
    printText(results, options.strict);
  }

  return failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDataQualityCheck(parseOptions(process.argv.slice(2)))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
