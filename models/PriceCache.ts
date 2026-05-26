import mongoose, { Schema } from "mongoose";

/** Cached Alpha Vantage quote, automatically expired by MongoDB TTL index. */
export interface IPriceCache {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  lastUpdated: Date;
  /** MongoDB TTL index deletes this document once expiresAt is in the past. */
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const PriceCacheSchema = new Schema<IPriceCache>(
  {
    symbol: { type: String, required: true, uppercase: true, unique: true },
    price: { type: Number, required: true },
    change: { type: Number, required: true },
    changePercent: { type: Number, required: true },
    previousClose: { type: Number, required: true },
    lastUpdated: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

/**
 * TTL index: MongoDB background task deletes documents automatically
 * when `expiresAt` passes, expireAfterSeconds: 0 means "delete immediately at that time".
 */
PriceCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PriceCache =
  mongoose.models.PriceCache ??
  mongoose.model<IPriceCache>("PriceCache", PriceCacheSchema);
