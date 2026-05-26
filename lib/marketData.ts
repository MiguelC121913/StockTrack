import { connectDB } from "@/lib/mongoose";
import { PriceCache, type IPriceCache } from "@/models/PriceCache";
import { HistoricalCache, type IHistoricalCache } from "@/models/HistoricalCache";
import type { QuoteData, HistoricalPoint } from "@/types";

const QUOTE_URL = "https://api.twelvedata.com/quote";
const TIME_SERIES_URL = "https://api.twelvedata.com/time_series";

/** Cache lifetime in milliseconds (5 minutes). */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Formats a Date or unknown value as YYYY-MM-DD. */
function toDateStr(d: Date | unknown): string {
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).split("T")[0];
}

/**
 * Inspects a Twelve Data JSON response for API-level errors.
 *
 * Twelve Data error shapes:
 *   { "code": 400, "message": "..." }  — bad symbol or parameter
 *   { "code": 401, "message": "..." }  — invalid API key
 *   { "code": 429, "message": "..." }  — daily rate limit exceeded
 *   { "status": "error", "message": "..." }
 *
 * Returns the error message string, or null when the payload looks healthy.
 */
function apiError(json: Record<string, unknown>): string | null {
  if (typeof json["code"] === "number" || json["status"] === "error") {
    return (json["message"] as string | undefined) ?? "Twelve Data API error";
  }
  return null;
}

// ─── Real-time quote ─────────────────────────────────────────────────────────

/**
 * Returns a real-time quote for the given symbol.
 *
 * Cache strategy: before calling Twelve Data (800 req/day free tier), we check
 * the `pricecaches` collection for a still-valid entry.  On a cache miss we
 * fetch from Twelve Data and upsert the result with `expiresAt = now + 5 min`.
 * MongoDB's TTL index removes expired entries automatically so the collection
 * stays small.
 *
 * Returns null on API error, unknown symbol, or network failure.
 */
export async function getQuote(symbol: string): Promise<QuoteData | null> {
  const upper = symbol.toUpperCase();
  await connectDB();

  const cached = await PriceCache.findOne({
    symbol: upper,
    expiresAt: { $gt: new Date() },
  }).lean<IPriceCache>();

  if (cached) {
    return {
      symbol: cached.symbol,
      price: cached.price,
      change: cached.change,
      changePercent: cached.changePercent,
      previousClose: cached.previousClose,
    };
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    console.error("getQuote: missing TWELVE_DATA_API_KEY");
    return null;
  }

  try {
    const url = `${QUOTE_URL}?symbol=${encodeURIComponent(upper)}&apikey=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      console.error(`getQuote: Twelve Data HTTP ${res.status} for "${upper}"`);
      return null;
    }

    const json: Record<string, unknown> = await res.json();

    const err = apiError(json);
    if (err) {
      console.error(`getQuote: "${upper}" – ${err}`);
      return null;
    }

    // Twelve Data /quote returns all numeric fields as strings.
    const price = parseFloat(json["close"] as string);
    const change = parseFloat(json["change"] as string);
    // Twelve Data field is "percent_change", already includes sign for negatives.
    const changePercent = parseFloat(json["percent_change"] as string);
    const previousClose = parseFloat(json["previous_close"] as string);

    if (!isFinite(price)) {
      console.error(`getQuote: unexpected response shape for "${upper}"`, json);
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

    await PriceCache.findOneAndUpdate(
      { symbol: upper },
      { symbol: upper, price, change, changePercent, previousClose, lastUpdated: now, expiresAt },
      { upsert: true, new: true }
    );

    return { symbol: upper, price, change, changePercent, previousClose };
  } catch (err) {
    console.error("getQuote: network error:", err);
    return null;
  }
}

// ─── Historical data ──────────────────────────────────────────────────────────

/**
 * Returns all available daily close prices for the given symbol in ascending
 * chronological order (oldest first).
 *
 * Cache strategy: past closing prices are immutable — a price from 2021-03-15
 * will never change.  We use a permanent cache (no TTL index) that is refreshed
 * at most once per calendar day.  New trading-day data becomes available the
 * following morning, so a once-per-day refresh is sufficient.
 *
 * When Twelve Data is unavailable (rate-limited or offline) we fall back to
 * stale cache data so the UI degrades gracefully.
 *
 * Returns null only when there is no cached data AND the API call fails.
 */
export async function getHistoricalData(
  symbol: string
): Promise<HistoricalPoint[] | null> {
  const upper = symbol.toUpperCase();
  await connectDB();

  const todayStr = new Date().toISOString().split("T")[0];
  const cached = await HistoricalCache.findOne({ symbol: upper }).lean<IHistoricalCache>();

  const fromCache = (cache: IHistoricalCache): HistoricalPoint[] =>
    cache.data.map((d) => ({ date: toDateStr(d.date), close: d.close }));

  if (cached && toDateStr(cached.lastFetched) === todayStr) {
    return fromCache(cached);
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    console.error("getHistoricalData: missing TWELVE_DATA_API_KEY");
    return cached ? fromCache(cached) : null;
  }

  try {
    const url =
      `${TIME_SERIES_URL}` +
      `?symbol=${encodeURIComponent(upper)}` +
      `&interval=1day` +
      `&outputsize=5000` +
      `&apikey=${apiKey}` +
      `&format=JSON`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      console.error(`getHistoricalData: Twelve Data HTTP ${res.status} for "${upper}"`);
      return cached ? fromCache(cached) : null;
    }

    const json: Record<string, unknown> = await res.json();

    const err = apiError(json);
    if (err) {
      console.error(`getHistoricalData: "${upper}" – ${err}`);
      return cached ? fromCache(cached) : null;
    }

    const values = json["values"] as Array<Record<string, string>> | undefined;
    if (!values || values.length === 0) {
      console.error(`getHistoricalData: empty time series for "${upper}"`);
      return cached ? fromCache(cached) : null;
    }

    // Twelve Data returns values in DESCENDING order (newest first).
    // Reverse to ascending so callers can binary-search or iterate forward in time.
    const points: HistoricalPoint[] = values
      .map((v) => ({ date: v["datetime"], close: parseFloat(v["close"]) }))
      .reverse();

    const now = new Date();
    await HistoricalCache.findOneAndUpdate(
      { symbol: upper },
      {
        symbol: upper,
        // Store as UTC midnight so toDateStr returns the original YYYY-MM-DD string.
        data: points.map((p) => ({
          date: new Date(p.date + "T00:00:00Z"),
          close: p.close,
        })),
        lastFetched: now,
      },
      { upsert: true, new: true }
    );

    return points;
  } catch (err) {
    console.error("getHistoricalData: network error:", err);
    return cached ? fromCache(cached) : null;
  }
}
