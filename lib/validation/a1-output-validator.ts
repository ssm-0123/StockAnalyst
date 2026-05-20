export type A1ValidationSeverity = "pass" | "warn" | "fail";

export type A1ValidationIssue = {
  code: string;
  severity: Exclude<A1ValidationSeverity, "pass">;
  path: string;
  message: string;
};

export type A1ValidationResult = {
  valid: boolean;
  severity: A1ValidationSeverity;
  issues: A1ValidationIssue[];
};

type JsonRecord = Record<string, unknown>;

const REQUIRED_MARKET_REGIME_FIELDS = [
  "stage",
  "crowdedness",
  "riskReward",
  "rotationProbability",
  "fragilityScore",
] as const;

const WEAK_TEXT = new Set(["", "n/a", "na", "none", "tbd", "todo", "미정", "없음", "근거 없음"]);
const EVIDENCE_CONFIDENCE_LEVELS = new Set(["verified", "inferred", "weak"]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasText(value: unknown) {
  const text = asString(value).toLowerCase();
  return text.length > 0 && !WEAK_TEXT.has(text);
}

function hasFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function parseDate(value: unknown): Date | null {
  const text = asString(value);
  if (!text) {
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function wholeDaysBetween(older: Date, newer: Date) {
  return Math.floor((newer.getTime() - older.getTime()) / 86_400_000);
}

function issue(
  code: string,
  severity: A1ValidationIssue["severity"],
  path: string,
  message: string,
): A1ValidationIssue {
  return { code, severity, path, message };
}

function resultFromIssues(issues: A1ValidationIssue[]): A1ValidationResult {
  const severity = issues.some((item) => item.severity === "fail")
    ? "fail"
    : issues.some((item) => item.severity === "warn")
      ? "warn"
      : "pass";

  return {
    valid: severity !== "fail",
    severity,
    issues,
  };
}

function extractSourceTimestamp(sourceNote: unknown): Date | null {
  const note = asString(sourceNote);
  const generatedAt = note.match(/generatedAt=([^,;\s]+)/i)?.[1];
  return parseDate(generatedAt);
}

function textIncludesAny(text: string, tokens: string[]) {
  const lower = text.toLowerCase();
  return tokens.some((token) => lower.includes(token));
}

function looksConcrete(text: string) {
  if (!hasText(text)) {
    return false;
  }

  return (
    /[0-9]/.test(text) ||
    textIncludesAny(text, [
      "earnings",
      "guidance",
      "contract",
      "order",
      "approval",
      "capacity",
      "margin",
      "sales",
      "revenue",
      "cash flow",
      "실적",
      "가이던스",
      "계약",
      "수주",
      "승인",
      "공급",
      "마진",
      "매출",
      "현금흐름",
    ])
  );
}

function isStrongSectorOnly(text: string) {
  if (!textIncludesAny(text, ["sector", "momentum", "theme", "섹터", "모멘텀", "테마", "수급"])) {
    return false;
  }

  return !textIncludesAny(text, [
    "price",
    "current",
    "valuation",
    "earnings",
    "guidance",
    "contract",
    "invalidation",
    "risk",
    "52",
    "가격",
    "현재가",
    "밸류",
    "실적",
    "가이던스",
    "계약",
    "무효",
    "리스크",
  ]);
}

function validateMarketRegime(input: JsonRecord, issues: A1ValidationIssue[]) {
  const marketRegime = input.marketRegime;

  if (!isRecord(marketRegime)) {
    issues.push(issue("missing-market-regime", "fail", "marketRegime", "marketRegime must exist."));
    return;
  }

  for (const field of REQUIRED_MARKET_REGIME_FIELDS) {
    const value = marketRegime[field];
    const valid = field === "stage" ? hasText(value) : hasFiniteNumber(value);

    if (!valid) {
      issues.push(
        issue(
          `missing-market-regime-${field}`,
          "fail",
          `marketRegime.${field}`,
          `marketRegime.${field} is required for publishable Agent #1 output.`,
        ),
      );
    }
  }
}

function validatePriceSnapshot(
  snapshot: unknown,
  path: string,
  analysisDate: Date | null,
  issues: A1ValidationIssue[],
) {
  if (!isRecord(snapshot)) {
    issues.push(issue("missing-price-snapshot", "fail", `${path}.priceSnapshot`, "Buy candidate needs a saved price snapshot."));
    return;
  }

  if (!hasFiniteNumber(snapshot.currentPrice)) {
    issues.push(
      issue("missing-current-price", "fail", `${path}.priceSnapshot.currentPrice`, "Buy candidate current price is missing."),
    );
  }

  if (!hasText(snapshot.sourceNote)) {
    issues.push(
      issue("missing-price-source", "fail", `${path}.priceSnapshot.sourceNote`, "Buy candidate price source is missing."),
    );
  }

  const priceDate = parseDate(snapshot.priceDate);
  if (!priceDate) {
    issues.push(
      issue("missing-price-asof", "fail", `${path}.priceSnapshot.priceDate`, "Buy candidate price asOf/date is missing."),
    );
  } else if (analysisDate && wholeDaysBetween(priceDate, analysisDate) > 2) {
    issues.push(
      issue("stale-price-asof", "warn", `${path}.priceSnapshot.priceDate`, "Saved price date appears stale versus analysis date."),
    );
  }

  const sourceTimestamp = extractSourceTimestamp(snapshot.sourceNote);
  if (!sourceTimestamp) {
    issues.push(
      issue(
        "missing-price-source-timing",
        "warn",
        `${path}.priceSnapshot.sourceNote`,
        "Price source timing is missing from the saved source note.",
      ),
    );
  } else if (analysisDate && wholeDaysBetween(sourceTimestamp, analysisDate) > 2) {
    issues.push(
      issue(
        "stale-price-source-timing",
        "warn",
        `${path}.priceSnapshot.sourceNote`,
        "Price source timestamp appears stale versus analysis date.",
      ),
    );
  }
}

function validateEvidenceArray(value: unknown, path: string, issues: A1ValidationIssue[]) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    issues.push(issue("malformed-evidence", "warn", path, "Evidence must be an array when provided."));
    return;
  }

  value.forEach((item, index) => {
    const evidencePath = `${path}[${index}]`;

    if (!isRecord(item)) {
      issues.push(issue("malformed-evidence-item", "warn", evidencePath, "Evidence item must be an object."));
      return;
    }

    for (const field of ["type", "claim", "source", "asOf", "confidence"] as const) {
      if (!hasText(item[field])) {
        issues.push(
          issue("incomplete-evidence-item", "warn", `${evidencePath}.${field}`, `Evidence item is missing ${field}.`),
        );
      }
    }

    const confidence = asString(item.confidence).toLowerCase();
    if (confidence && !EVIDENCE_CONFIDENCE_LEVELS.has(confidence)) {
      issues.push(
        issue(
          "ambiguous-evidence-confidence",
          "warn",
          `${evidencePath}.confidence`,
          "Evidence confidence must distinguish verified, inferred, and weak.",
        ),
      );
    }
  });
}

function validateBuyCandidate(
  candidate: JsonRecord,
  path: string,
  contextText: string,
  analysisDate: Date | null,
  issues: A1ValidationIssue[],
) {
  validatePriceSnapshot(candidate.priceSnapshot, path, analysisDate, issues);

  const thesisText = [candidate.thesis, candidate.rationale, candidate.whyNow].map(asString).filter(Boolean).join(" ");
  if (!hasText(thesisText)) {
    issues.push(issue("missing-buy-thesis", "fail", path, "Buy candidate thesis or rationale is missing."));
  }

  const catalystText = [
    ...asArray(candidate.catalysts).map(asString),
    candidate.catalyst,
    candidate.whyNow,
    contextText,
  ]
    .map(asString)
    .filter(Boolean)
    .join(" ");

  if (!looksConcrete(catalystText)) {
    issues.push(issue("weak-buy-catalyst", "warn", path, "Buy candidate catalyst is missing or too generic."));
  }

  const riskText = [candidate.invalidation, candidate.risk, ...asArray(candidate.risks).map(asString)]
    .map(asString)
    .filter(Boolean)
    .join(" ");
  if (!hasText(riskText)) {
    issues.push(issue("missing-buy-risk", "fail", path, "Buy candidate needs a risk or invalidation condition."));
  }

  const rationaleText = `${thesisText} ${catalystText}`;
  if (isStrongSectorOnly(rationaleText)) {
    issues.push(
      issue(
        "strong-sector-only-rationale",
        "warn",
        path,
        "Buy rationale appears to rely only on sector momentum without stock-specific support.",
      ),
    );
  }
}

function validateSectors(input: JsonRecord, analysisDate: Date | null, issues: A1ValidationIssue[]) {
  for (const group of ["promisingSectors", "cautionSectors"] as const) {
    asArray(input[group]).forEach((sectorValue, sectorIndex) => {
      const sectorPath = `${group}[${sectorIndex}]`;
      if (!isRecord(sectorValue)) {
        return;
      }

      validateEvidenceArray(sectorValue.evidence, `${sectorPath}.evidence`, issues);

      const contextText = [
        sectorValue.thesis,
        ...asArray(sectorValue.keyDrivers).map(asString),
        ...asArray(sectorValue.risks).map(asString),
        ...asArray(sectorValue.headwinds).map(asString),
      ]
        .map(asString)
        .filter(Boolean)
        .join(" ");

      asArray(sectorValue.stocks).forEach((stockValue, stockIndex) => {
        const stockPath = `${sectorPath}.stocks[${stockIndex}]`;
        if (!isRecord(stockValue)) {
          return;
        }

        validateEvidenceArray(stockValue.evidence, `${stockPath}.evidence`, issues);

        if (stockValue.actionBias === "buy" || stockValue.isNew === true) {
          validateBuyCandidate(stockValue, stockPath, contextText, analysisDate, issues);
        }
      });
    });
  }
}

function validateSmallCaps(input: JsonRecord, analysisDate: Date | null, issues: A1ValidationIssue[]) {
  asArray(input.smallCapIdeas).forEach((ideaValue, index) => {
    const ideaPath = `smallCapIdeas[${index}]`;
    if (!isRecord(ideaValue)) {
      return;
    }

    validateEvidenceArray(ideaValue.evidence, `${ideaPath}.evidence`, issues);
    validateBuyCandidate(ideaValue, ideaPath, asString(ideaValue.theme), analysisDate, issues);
  });
}

export function validateA1Output(value: unknown): A1ValidationResult {
  const issues: A1ValidationIssue[] = [];

  if (!isRecord(value)) {
    return resultFromIssues([
      issue("malformed-output", "fail", "$", "Agent #1 output must be a JSON object."),
    ]);
  }

  const analysisDate = parseDate(value.date) ?? parseDate(value.lastUpdated);

  validateMarketRegime(value, issues);
  validateEvidenceArray(value.evidence, "evidence", issues);
  validateSectors(value, analysisDate, issues);
  validateSmallCaps(value, analysisDate, issues);

  return resultFromIssues(issues);
}
