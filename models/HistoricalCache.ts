import mongoose, { Schema } from "mongoose";

export interface IHistoricalPoint {
  date: Date;
  close: number;
}

export interface IHistoricalCache {
  symbol: string;
  data: IHistoricalPoint[];
  lastFetched: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/** No _id on sub-documents — avoids per-entry overhead on arrays with 5000+ points. */
const HistoricalPointSchema = new Schema<IHistoricalPoint>(
  {
    date: { type: Date, required: true },
    close: { type: Number, required: true },
  },
  { _id: false }
);

const HistoricalCacheSchema = new Schema<IHistoricalCache>(
  {
    symbol: { type: String, required: true, uppercase: true, unique: true },
    data: { type: [HistoricalPointSchema], required: true, default: [] },
    /** Refreshed at most once per calendar day — historical close prices don't change. */
    lastFetched: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export const HistoricalCache =
  mongoose.models.HistoricalCache ??
  mongoose.model<IHistoricalCache>("HistoricalCache", HistoricalCacheSchema);
