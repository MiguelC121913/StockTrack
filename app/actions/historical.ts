"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { getHistoricalData } from "@/lib/marketData";
import type { HistoricalPoint, BacktestResult } from "@/types";

export type ChartRange = "1M" | "3M" | "1Y" | "5Y" | "ALL";

const RANGE_DAYS: Record<Exclude<ChartRange, "ALL">, number> = {
  "1M": 30,
  "3M": 90,
  "1Y": 365,
  "5Y": 1825,
};

/**
 * Returns historical close prices for the given symbol filtered to the requested range.
 * Requires an active session; returns null for anonymous requests.
 */
export async function getHistoricalForSymbol(
  symbol: string,
  range: ChartRange
): Promise<{ symbol: string; data: HistoricalPoint[] } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  await connectDB();
  const all = await getHistoricalData(symbol.toUpperCase());
  if (!all || all.length === 0) return null;

  let data: HistoricalPoint[];

  if (range === "ALL") {
    data = all;
  } else {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    data = all.filter((p) => p.date >= cutoffStr);
  }

  return { symbol: symbol.toUpperCase(), data };
}

/**
 * Simulates buying `investedAmount` dollars of `symbol` on `purchaseDate` and
 * holding to the most recent trading day.
 *
 * If the requested date falls on a weekend or holiday, the next available
 * trading day is used (markets were closed, so the first opportunity to buy
 * was when they reopened).
 */
export async function simulateBacktest(input: {
  symbol: string;
  investedAmount: number;
  purchaseDate: string; // YYYY-MM-DD
}): Promise<BacktestResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const upper = input.symbol.trim().toUpperCase();
  const { investedAmount, purchaseDate } = input;

  if (!upper) return { error: "Symbol is required" };
  if (!isFinite(investedAmount) || investedAmount <= 0)
    return { error: "Amount must be greater than 0" };

  // Compare as UTC midnight to avoid timezone drift.
  const purchaseDateMs = new Date(purchaseDate + "T00:00:00Z").getTime();
  if (purchaseDateMs >= Date.now()) {
    return { error: "Purchase date cannot be in the future" };
  }

  await connectDB();

  const all = await getHistoricalData(upper);
  if (!all || all.length === 0)
    return { error: `No historical data available for "${upper}"` };

  // First trading day on or after purchaseDate.
  const purchasePoint = all.find((p) => p.date >= purchaseDate);
  if (!purchasePoint)
    return { error: "Purchase date is after the last available trading day" };

  const latestPoint = all[all.length - 1];

  const purchasePrice = purchasePoint.close;
  const sharesEquivalent = investedAmount / purchasePrice;
  const currentPrice = latestPoint.close;
  const currentValue = sharesEquivalent * currentPrice;
  const gainLoss = currentValue - investedAmount;
  const gainLossPercent = (gainLoss / investedAmount) * 100;

  const purchaseDateMs2 = new Date(purchasePoint.date + "T00:00:00Z").getTime();
  const latestDateMs = new Date(latestPoint.date + "T00:00:00Z").getTime();
  const yearsHeld =
    (latestDateMs - purchaseDateMs2) / (365.25 * 24 * 60 * 60 * 1000);

  const cagr =
    yearsHeld >= 1
      ? (Math.pow(currentValue / investedAmount, 1 / yearsHeld) - 1) * 100
      : null;

  const chartData = all.filter((p) => p.date >= purchasePoint.date);

  return {
    symbol: upper,
    investedAmount,
    purchaseDate: purchasePoint.date,
    purchasePrice,
    sharesEquivalent,
    currentPrice,
    currentValue,
    gainLoss,
    gainLossPercent,
    cagr,
    chartData,
  };
}
