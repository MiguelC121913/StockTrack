import { getMyHoldings } from "@/app/actions/holdings";
import { getQuote } from "@/lib/marketData";
import type { HoldingWithPrice } from "@/types";

/**
 * Returns all holdings for the current user enriched with live price data.
 * Twelve Data quotes are cached in MongoDB (TTL 5 min) to stay within the
 * free-tier daily call limit.  When a quote is unavailable, `isPriceUnavailable`
 * is set to true and price-derived fields default to 0.
 */
export async function getHoldingsWithPrices(): Promise<HoldingWithPrice[]> {
  const holdings = await getMyHoldings();

  const results = await Promise.all(
    holdings.map(async (holding) => {
      const totalCost = holding.shares * holding.costBasis;
      const quote = await getQuote(holding.symbol);

      if (!quote) {
        return {
          ...holding,
          currentPrice: 0,
          currentValue: 0,
          totalCost,
          gainLoss: 0,
          gainLossPercent: 0,
          change: 0,
          changePercent: 0,
          isPriceUnavailable: true,
        };
      }

      const currentValue = holding.shares * quote.price;
      const gainLoss = currentValue - totalCost;
      const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

      return {
        ...holding,
        currentPrice: quote.price,
        currentValue,
        totalCost,
        gainLoss,
        gainLossPercent,
        change: quote.change,
        changePercent: quote.changePercent,
        isPriceUnavailable: false,
      };
    })
  );

  return results;
}
