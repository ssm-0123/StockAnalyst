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
type CanonicalPriceSnapshot = {
  priceDate?: string;
  currentPrice?: number;
  previousClose?: number;
  previousCloseChangeAmount?: number;
  previousCloseChangePct?: number;
  priceSession?: string;
  week52High?: number;
  week52Low?: number;
  currency?: string;
  sourceNote?: string;
};

type CanonicalPriceEntry = {
  ticker?: string;
  market?: string;
  source?: string;
  snapshot?: CanonicalPriceSnapshot;
};

export type A1ValidationOptions = {
  pricesSnapshot?: {
    generatedAt?: string;
    entries?: CanonicalPriceEntry[];
  } | null;
};

const REQUIRED_MARKET_REGIME_FIELDS = [
  "stage",
  "crowdedness",
  "riskReward",
  "rotationProbability",
  "fragilityScore",
] as const;
const MAX_PRICE_SOURCE_AGE_HOURS = 6;

const WEAK_TEXT = new Set(["", "n/a", "na", "none", "tbd", "todo", "미정", "없음", "근거 없음"]);
const EVIDENCE_CONFIDENCE_LEVELS = new Set(["verified", "inferred", "weak"]);
const THEME_EVENT_TYPES = new Set([
  "person_visit",
  "policy",
  "regulation",
  "earnings_event",
  "corporate_action",
  "geopolitics",
  "social_issue",
  "product_launch",
  "conference",
  "other",
]);
const THEME_SOURCE_FRESHNESS = new Set(["today", "1-3d", "stale", "unverified"]);
const THEME_TRADABILITY = new Set(["actionable", "watch_after_spike", "wait_for_confirmation", "avoid_chase"]);
const ACTION_BIASES = new Set(["buy", "hold", "reduce", "exit"]);
const TIME_HORIZONS = new Set(["1-3d", "1-3w", "1-3m"]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTicker(value: unknown) {
  const raw = asString(value).toUpperCase();
  if (!raw) return "";
  const alnum = raw.replace(/[^A-Z0-9]/g, "");
  if (/^\d+$/.test(alnum)) return alnum.padStart(6, "0").slice(-6);
  return alnum;
}

function priceSnapshotKey(market: unknown, ticker: unknown) {
  const normalizedMarket = asString(market).toUpperCase();
  const normalizedTicker = normalizeTicker(ticker);
  return normalizedMarket && normalizedTicker ? `${normalizedMarket}:${normalizedTicker}` : "";
}

function hasText(value: unknown) {
  const text = asString(value).toLowerCase();
  return text.length > 0 && !WEAK_TEXT.has(text);
}

function hasFiniteNumber(value: unknown): value is number {
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

function hoursBetween(older: Date, newer: Date) {
  return (newer.getTime() - older.getTime()) / 3_600_000;
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

function buildCanonicalPriceMap(pricesSnapshot: A1ValidationOptions["pricesSnapshot"]) {
  const entries = pricesSnapshot?.entries ?? [];
  const map = new Map<string, CanonicalPriceEntry>();
  for (const entry of entries) {
    const key = priceSnapshotKey(entry.market, entry.ticker);
    if (key && entry.snapshot) {
      map.set(key, entry);
    }
  }
  return map;
}

function numberDiffers(actual: unknown, expected: unknown, tolerance: number) {
  if (!hasFiniteNumber(expected)) {
    return false;
  }

  return !hasFiniteNumber(actual) || Math.abs(actual - expected) > tolerance;
}

function priceTolerance(expected: number) {
  return Math.max(0.01, Math.abs(expected) * 0.0001);
}

function validateCanonicalPriceSnapshot(
  candidate: JsonRecord,
  path: string,
  canonicalPrices: Map<string, CanonicalPriceEntry>,
  pricesGeneratedAt: string | undefined,
  issues: A1ValidationIssue[],
) {
  const key = priceSnapshotKey(candidate.market, candidate.ticker);
  if (!key) {
    return;
  }

  const canonical = canonicalPrices.get(key);
  const expected = canonical?.snapshot;
  if (!expected) {
    return;
  }

  const actual = candidate.priceSnapshot;
  if (!isRecord(actual)) {
    issues.push(
      issue(
        "missing-canonical-price-snapshot",
        "fail",
        `${path}.priceSnapshot`,
        "Candidate is present in prices_snapshot.json but Agent #1 did not embed the canonical priceSnapshot.",
      ),
    );
    return;
  }

  if (expected.priceDate && asString(actual.priceDate) !== expected.priceDate) {
    issues.push(
      issue(
        "canonical-price-date-mismatch",
        "fail",
        `${path}.priceSnapshot.priceDate`,
        `Agent #1 priceDate must match prices_snapshot.json (${expected.priceDate}).`,
      ),
    );
  }

  if (numberDiffers(actual.currentPrice, expected.currentPrice, priceTolerance(expected.currentPrice ?? 0))) {
    issues.push(
      issue(
        "canonical-current-price-mismatch",
        "fail",
        `${path}.priceSnapshot.currentPrice`,
        `Agent #1 currentPrice must match prices_snapshot.json (${expected.currentPrice}).`,
      ),
    );
  }

  if (numberDiffers(actual.previousClose, expected.previousClose, priceTolerance(expected.previousClose ?? 0))) {
    issues.push(
      issue(
        "canonical-previous-close-mismatch",
        "fail",
        `${path}.priceSnapshot.previousClose`,
        `Agent #1 previousClose must match prices_snapshot.json (${expected.previousClose}).`,
      ),
    );
  }

  if (numberDiffers(actual.previousCloseChangeAmount, expected.previousCloseChangeAmount, priceTolerance(expected.previousCloseChangeAmount ?? 0))) {
    issues.push(
      issue(
        "canonical-change-amount-mismatch",
        "fail",
        `${path}.priceSnapshot.previousCloseChangeAmount`,
        `Agent #1 previousCloseChangeAmount must match prices_snapshot.json (${expected.previousCloseChangeAmount}).`,
      ),
    );
  }

  if (numberDiffers(actual.previousCloseChangePct, expected.previousCloseChangePct, 0.05)) {
    issues.push(
      issue(
        "canonical-change-pct-mismatch",
        "fail",
        `${path}.priceSnapshot.previousCloseChangePct`,
        `Agent #1 previousCloseChangePct must match prices_snapshot.json (${expected.previousCloseChangePct}).`,
      ),
    );
  }

  if (expected.priceSession && asString(actual.priceSession) !== expected.priceSession) {
    issues.push(
      issue(
        "canonical-price-session-mismatch",
        "fail",
        `${path}.priceSnapshot.priceSession`,
        `Agent #1 priceSession must match prices_snapshot.json (${expected.priceSession}).`,
      ),
    );
  }

  if (numberDiffers(actual.week52High, expected.week52High, priceTolerance(expected.week52High ?? 0))) {
    issues.push(
      issue(
        "canonical-week52-high-mismatch",
        "fail",
        `${path}.priceSnapshot.week52High`,
        `Agent #1 week52High must match prices_snapshot.json (${expected.week52High}).`,
      ),
    );
  }

  if (numberDiffers(actual.week52Low, expected.week52Low, priceTolerance(expected.week52Low ?? 0))) {
    issues.push(
      issue(
        "canonical-week52-low-mismatch",
        "fail",
        `${path}.priceSnapshot.week52Low`,
        `Agent #1 week52Low must match prices_snapshot.json (${expected.week52Low}).`,
      ),
    );
  }

  if (expected.currency && asString(actual.currency) !== expected.currency) {
    issues.push(
      issue(
        "canonical-currency-mismatch",
        "fail",
        `${path}.priceSnapshot.currency`,
        `Agent #1 currency must match prices_snapshot.json (${expected.currency}).`,
      ),
    );
  }

  const sourceNote = asString(actual.sourceNote);
  if (pricesGeneratedAt && !sourceNote.includes(pricesGeneratedAt)) {
    issues.push(
      issue(
        "canonical-price-source-generation-mismatch",
        "fail",
        `${path}.priceSnapshot.sourceNote`,
        `Agent #1 sourceNote must reference prices_snapshot generatedAt=${pricesGeneratedAt}.`,
      ),
    );
  }
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

function hasPricePositionText(text: string) {
  return textIncludesAny(text, [
    "current price",
    "52-week",
    "52 week",
    "high",
    "low",
    "pullback",
    "premium",
    "discount",
    "price",
    "현재가",
    "52주",
    "고점",
    "저점",
    "눌림",
    "할인",
    "프리미엄",
    "가격",
    "전일 대비",
  ]);
}

function validateResearchFrame(candidate: JsonRecord, path: string, issues: A1ValidationIssue[]) {
  const actionBias = asString(candidate.actionBias);
  if (!ACTION_BIASES.has(actionBias)) {
    issues.push(issue("missing-action-bias", "warn", `${path}.actionBias`, "Every public stock idea needs an actionBias analysis signal."));
  }

  const timeHorizon = asString(candidate.timeHorizon);
  if (!TIME_HORIZONS.has(timeHorizon)) {
    issues.push(issue("missing-time-horizon", "warn", `${path}.timeHorizon`, "Every public stock idea needs a concrete time horizon."));
  }

  if (!hasText(candidate.invalidation)) {
    issues.push(issue("missing-invalidation", "warn", `${path}.invalidation`, "Every public stock idea needs an invalidation condition."));
  }

  if (!hasText(candidate.positioningNote)) {
    issues.push(issue("missing-positioning-note", "warn", `${path}.positioningNote`, "Every public stock idea needs a concise observation note."));
  }

  const decisionText = [candidate.rationale, candidate.whyNow, candidate.thesis, candidate.positioningNote]
    .map(asString)
    .filter(Boolean)
    .join(" ");
  if ((candidate.actionBias === "buy" || candidate.isNew === true) && !hasPricePositionText(decisionText)) {
    issues.push(
      issue(
        "missing-price-position-frame",
        "warn",
        path,
        "Interest-expansion candidates should explain price position, not only story or sector strength.",
      ),
    );
  }
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
  referenceTimestamp: Date | null,
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
  } else if (referenceTimestamp && hoursBetween(sourceTimestamp, referenceTimestamp) > MAX_PRICE_SOURCE_AGE_HOURS) {
    issues.push(
      issue(
        "stale-price-source-timing",
        "fail",
        `${path}.priceSnapshot.sourceNote`,
        `Price source timestamp is older than ${MAX_PRICE_SOURCE_AGE_HOURS} hours versus output lastUpdated.`,
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
  referenceTimestamp: Date | null,
  issues: A1ValidationIssue[],
) {
  validatePriceSnapshot(candidate.priceSnapshot, path, analysisDate, referenceTimestamp, issues);

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

function validateSectors(
  input: JsonRecord,
  analysisDate: Date | null,
  referenceTimestamp: Date | null,
  canonicalPrices: Map<string, CanonicalPriceEntry>,
  pricesGeneratedAt: string | undefined,
  issues: A1ValidationIssue[],
) {
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

        validateCanonicalPriceSnapshot(stockValue, stockPath, canonicalPrices, pricesGeneratedAt, issues);
        validateEvidenceArray(stockValue.evidence, `${stockPath}.evidence`, issues);
        validateResearchFrame(stockValue, stockPath, issues);

        if (stockValue.actionBias === "buy" || stockValue.isNew === true) {
          validateBuyCandidate(stockValue, stockPath, contextText, analysisDate, referenceTimestamp, issues);
        }
      });
    });
  }
}

function validateSmallCaps(
  input: JsonRecord,
  analysisDate: Date | null,
  referenceTimestamp: Date | null,
  canonicalPrices: Map<string, CanonicalPriceEntry>,
  pricesGeneratedAt: string | undefined,
  issues: A1ValidationIssue[],
) {
  asArray(input.smallCapIdeas).forEach((ideaValue, index) => {
    const ideaPath = `smallCapIdeas[${index}]`;
    if (!isRecord(ideaValue)) {
      return;
    }

    validateCanonicalPriceSnapshot(ideaValue, ideaPath, canonicalPrices, pricesGeneratedAt, issues);
    validateEvidenceArray(ideaValue.evidence, `${ideaPath}.evidence`, issues);
    validateResearchFrame(ideaValue, ideaPath, issues);
    validateBuyCandidate(ideaValue, ideaPath, asString(ideaValue.theme), analysisDate, referenceTimestamp, issues);
  });
}

function validateThemeRadar(
  input: JsonRecord,
  analysisDate: Date | null,
  referenceTimestamp: Date | null,
  canonicalPrices: Map<string, CanonicalPriceEntry>,
  pricesGeneratedAt: string | undefined,
  issues: A1ValidationIssue[],
) {
  asArray(input.themeRadar).forEach((themeValue, themeIndex) => {
    const themePath = `themeRadar[${themeIndex}]`;
    if (!isRecord(themeValue)) {
      return;
    }

    for (const field of ["theme", "eventType", "narrative", "marketReaction", "tradability", "risk", "whatToWatch"] as const) {
      if (!hasText(themeValue[field])) {
        issues.push(issue("incomplete-theme-radar", "warn", `${themePath}.${field}`, `Theme radar item is missing ${field}.`));
      }
    }

    if (!hasFiniteNumber(themeValue.signalStrength)) {
      issues.push(issue("missing-theme-signal-strength", "warn", `${themePath}.signalStrength`, "Theme radar needs a 0-100 signalStrength."));
    } else if (themeValue.signalStrength < 0 || themeValue.signalStrength > 100) {
      issues.push(issue("invalid-theme-signal-strength", "warn", `${themePath}.signalStrength`, "Theme radar signalStrength must be between 0 and 100."));
    }

    if (hasText(themeValue.eventType) && !THEME_EVENT_TYPES.has(asString(themeValue.eventType))) {
      issues.push(issue("invalid-theme-event-type", "warn", `${themePath}.eventType`, "Theme radar eventType is not in the allowed set."));
    }

    if (hasText(themeValue.sourceFreshness) && !THEME_SOURCE_FRESHNESS.has(asString(themeValue.sourceFreshness))) {
      issues.push(issue("invalid-theme-source-freshness", "warn", `${themePath}.sourceFreshness`, "Theme radar sourceFreshness is not in the allowed set."));
    }

    if (hasText(themeValue.tradability) && !THEME_TRADABILITY.has(asString(themeValue.tradability))) {
      issues.push(issue("invalid-theme-tradability", "warn", `${themePath}.tradability`, "Theme radar tradability is not in the allowed set."));
    }

    if (themeValue.tradability === "actionable" && hasFiniteNumber(themeValue.signalStrength) && themeValue.signalStrength < 70) {
      issues.push(
        issue(
          "weak-actionable-theme-signal",
          "warn",
          themePath,
          "Actionable theme radar items should have signalStrength of at least 70 or be downgraded to wait_for_confirmation.",
        ),
      );
    }

    if (
      themeValue.tradability === "actionable" &&
      (themeValue.sourceFreshness === "stale" || themeValue.sourceFreshness === "unverified")
    ) {
      issues.push(
        issue(
          "unverified-actionable-theme",
          "warn",
          themePath,
          "Actionable theme radar items need fresh sources; stale or unverified themes should wait for confirmation.",
        ),
      );
    }

    const contextText = [
      themeValue.theme,
      themeValue.narrative,
      themeValue.marketReaction,
      themeValue.whatToWatch,
      ...asArray(themeValue.evidence).map(asString),
    ]
      .map(asString)
      .filter(Boolean)
      .join(" ");

    if (!Array.isArray(themeValue.affectedStocks) || themeValue.affectedStocks.length === 0) {
      issues.push(issue("missing-theme-affected-stocks", "warn", `${themePath}.affectedStocks`, "Theme radar should name affected stocks."));
      return;
    }

    asArray(themeValue.affectedStocks).forEach((stockValue, stockIndex) => {
      const stockPath = `${themePath}.affectedStocks[${stockIndex}]`;
      if (!isRecord(stockValue)) {
        return;
      }

      validateCanonicalPriceSnapshot(stockValue, stockPath, canonicalPrices, pricesGeneratedAt, issues);
      validateEvidenceArray(stockValue.evidence, `${stockPath}.evidence`, issues);
      validateResearchFrame(stockValue, stockPath, issues);

      if (stockValue.actionBias === "buy" || stockValue.isNew === true) {
        validateBuyCandidate(stockValue, stockPath, contextText, analysisDate, referenceTimestamp, issues);
      }
    });
  });
}

export function validateA1Output(value: unknown, options: A1ValidationOptions = {}): A1ValidationResult {
  const issues: A1ValidationIssue[] = [];

  if (!isRecord(value)) {
    return resultFromIssues([
      issue("malformed-output", "fail", "$", "Agent #1 output must be a JSON object."),
    ]);
  }

  const analysisDate = parseDate(value.date) ?? parseDate(value.lastUpdated);
  const referenceTimestamp = parseDate(value.lastUpdated) ?? analysisDate;
  const canonicalPrices = buildCanonicalPriceMap(options.pricesSnapshot);
  const pricesGeneratedAt = options.pricesSnapshot?.generatedAt;

  validateMarketRegime(value, issues);
  validateEvidenceArray(value.evidence, "evidence", issues);
  validateSectors(value, analysisDate, referenceTimestamp, canonicalPrices, pricesGeneratedAt, issues);
  validateSmallCaps(value, analysisDate, referenceTimestamp, canonicalPrices, pricesGeneratedAt, issues);
  validateThemeRadar(value, analysisDate, referenceTimestamp, canonicalPrices, pricesGeneratedAt, issues);

  return resultFromIssues(issues);
}
