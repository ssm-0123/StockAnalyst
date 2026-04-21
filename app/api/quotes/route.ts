import { NextRequest, NextResponse } from "next/server";

import { MarketCode, StockPriceSnapshot } from "@/lib/types";

export const revalidate = 300;

interface YahooQuoteResult {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency?: string;
  regularMarketTime?: number;
}

interface YahooChartMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency?: string;
  regularMarketTime?: number;
}

function normalizeCurrency(currency: string | undefined, market: MarketCode): "KRW" | "USD" {
  if (currency === "KRW") {
    return "KRW";
  }

  if (currency === "USD") {
    return "USD";
  }

  return market === "KR" ? "KRW" : "USD";
}

function formatDateFromUnix(unixTime?: number) {
  if (!unixTime) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Date(unixTime * 1000).toISOString().slice(0, 10);
}

function normalizeQuotePayload(result: YahooQuoteResult, market: MarketCode): StockPriceSnapshot {
  const previousClose = result.regularMarketPreviousClose;
  const changePct =
    result.regularMarketChangePercent ??
    (typeof result.regularMarketPrice === "number" && typeof previousClose === "number" && previousClose !== 0
      ? ((result.regularMarketPrice - previousClose) / previousClose) * 100
      : undefined);

  return {
    priceDate: formatDateFromUnix(result.regularMarketTime),
    currentPrice: result.regularMarketPrice,
    previousCloseChangePct: changePct,
    week52High: result.fiftyTwoWeekHigh,
    week52Low: result.fiftyTwoWeekLow,
    currency: normalizeCurrency(result.currency, market),
    sourceNote: "Yahoo Finance 최근 시세 기준",
  };
}

function normalizeChartPayload(meta: YahooChartMeta, market: MarketCode): StockPriceSnapshot {
  const previousClose = meta.previousClose ?? meta.chartPreviousClose;
  const changePct =
    typeof meta.regularMarketPrice === "number" && typeof previousClose === "number" && previousClose !== 0
      ? ((meta.regularMarketPrice - previousClose) / previousClose) * 100
      : undefined;

  return {
    priceDate: formatDateFromUnix(meta.regularMarketTime),
    currentPrice: meta.regularMarketPrice,
    previousCloseChangePct: changePct,
    week52High: meta.fiftyTwoWeekHigh,
    week52Low: meta.fiftyTwoWeekLow,
    currency: normalizeCurrency(meta.currency, market),
    sourceNote: "Yahoo Finance 종목 페이지 기준",
  };
}

function isPlausibleSnapshot(snapshot: StockPriceSnapshot) {
  if (
    typeof snapshot.previousCloseChangePct === "number" &&
    Math.abs(snapshot.previousCloseChangePct) > 50
  ) {
    return false;
  }

  if (
    typeof snapshot.currentPrice === "number" &&
    typeof snapshot.week52High === "number" &&
    snapshot.currentPrice > snapshot.week52High * 1.5
  ) {
    return false;
  }

  if (
    typeof snapshot.currentPrice === "number" &&
    typeof snapshot.week52Low === "number" &&
    snapshot.week52Low > 0 &&
    snapshot.currentPrice < snapshot.week52Low * 0.5
  ) {
    return false;
  }

  return true;
}

async function fetchWithDefaults(url: string) {
  return fetch(url, {
    next: { revalidate: 300 },
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json,text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9,ko-KR;q=0.8",
    },
  });
}

async function fetchYahooQuote(symbol: string) {
  const response = await fetchWithDefaults(
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    quoteResponse?: {
      result?: YahooQuoteResult[];
    };
  };

  return payload.quoteResponse?.result?.[0] ?? null;
}

async function fetchYahooChartMeta(symbol: string) {
  const response = await fetchWithDefaults(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`,
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    chart?: {
      result?: Array<{
        meta?: YahooChartMeta;
      }>;
    };
  };

  return payload.chart?.result?.[0]?.meta ?? null;
}

function extractRawNumber(pattern: RegExp, text: string) {
  const match = text.match(pattern);
  if (!match?.[1]) {
    return undefined;
  }

  const value = Number(match[1]);
  return Number.isNaN(value) ? undefined : value;
}

async function fetchYahooQuoteFromPage(symbol: string) {
  const response = await fetchWithDefaults(`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`);

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const regularMarketPrice = extractRawNumber(/"regularMarketPrice"\s*:\s*\{"raw"\s*:\s*([0-9.]+)/, html);
  const regularMarketChangePercent = extractRawNumber(
    /"regularMarketChangePercent"\s*:\s*\{"raw"\s*:\s*(-?[0-9.]+)/,
    html,
  );
  const regularMarketPreviousClose = extractRawNumber(/"regularMarketPreviousClose"\s*:\s*\{"raw"\s*:\s*([0-9.]+)/, html);
  const fiftyTwoWeekHigh = extractRawNumber(/"fiftyTwoWeekHigh"\s*:\s*\{"raw"\s*:\s*([0-9.]+)/, html);
  const fiftyTwoWeekLow = extractRawNumber(/"fiftyTwoWeekLow"\s*:\s*\{"raw"\s*:\s*([0-9.]+)/, html);
  const regularMarketTime = extractRawNumber(/"regularMarketTime"\s*:\s*\{"raw"\s*:\s*([0-9.]+)/, html);
  const currencyMatch = html.match(/"currency"\s*:\s*"([A-Z]{3})"/);

  if (typeof regularMarketPrice !== "number") {
    return null;
  }

  return {
    regularMarketPrice,
    regularMarketChangePercent,
    regularMarketPreviousClose,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    regularMarketTime,
    currency: currencyMatch?.[1],
  } satisfies YahooQuoteResult;
}

function buildSymbolCandidates(symbol: string, market: MarketCode, quoteSymbol?: string) {
  if (quoteSymbol) {
    return [quoteSymbol];
  }

  if (market === "KR") {
    return [`${symbol}.KS`, `${symbol}.KQ`];
  }

  return [symbol];
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const market = request.nextUrl.searchParams.get("market") as MarketCode | null;
  const quoteSymbol = request.nextUrl.searchParams.get("quoteSymbol") ?? undefined;

  if (!symbol || !market || !["KR", "US", "GLOBAL"].includes(market)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const candidates = buildSymbolCandidates(symbol, market, quoteSymbol);

  for (const candidate of candidates) {
    const pageQuote = await fetchYahooQuoteFromPage(candidate);

    if (pageQuote?.regularMarketPrice != null) {
      const normalized = normalizeQuotePayload(pageQuote, market);
      if (isPlausibleSnapshot(normalized)) {
        return NextResponse.json(normalized, {
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          },
        });
      }
    }

    const quote = await fetchYahooQuote(candidate);

    if (quote?.regularMarketPrice != null) {
      const normalized = normalizeQuotePayload(quote, market);
      if (isPlausibleSnapshot(normalized)) {
        return NextResponse.json(normalized, {
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          },
        });
      }
    }

    const chartMeta = await fetchYahooChartMeta(candidate);

    if (chartMeta?.regularMarketPrice != null) {
      const normalized = normalizeChartPayload(chartMeta, market);
      if (isPlausibleSnapshot(normalized)) {
        return NextResponse.json(normalized, {
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
          },
        });
      }
    }
  }

  return NextResponse.json({ error: "quote_not_found" }, { status: 404 });
}
