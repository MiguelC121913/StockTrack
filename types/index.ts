/** Serialized holding document safe to pass across the Server/Client boundary. */
export interface HoldingDoc {
  _id: string;
  user: string;
  symbol: string;
  shares: number;
  costBasis: number;
  purchaseDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** HoldingDoc enriched with live price data from Alpha Vantage. */
export interface HoldingWithPrice extends HoldingDoc {
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  /** Day change in dollars. */
  change: number;
  /** Day change as a percentage. */
  changePercent: number;
  /** True when the Alpha Vantage quote was unavailable (rate-limit or invalid symbol). */
  isPriceUnavailable: boolean;
}

/** Quote data returned by Alpha Vantage GLOBAL_QUOTE endpoint. */
export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
}

/** One day of OHLCV data reduced to just the closing price. */
export interface HistoricalPoint {
  date: string; // YYYY-MM-DD
  close: number;
}

/** Discriminated union returned by simulateBacktest. */
export type BacktestResult =
  | { error: string }
  | {
      symbol: string;
      investedAmount: number;
      /** Actual trading day used (may be after the requested date if it fell on a weekend). */
      purchaseDate: string;
      purchasePrice: number;
      sharesEquivalent: number;
      currentPrice: number;
      currentValue: number;
      gainLoss: number;
      gainLossPercent: number;
      /** Compound Annual Growth Rate; null when holding period < 1 year. */
      cagr: number | null;
      chartData: HistoricalPoint[];
    };
