import mongoose, { Schema, Types } from "mongoose";

/** Raw shape of a Holding document in MongoDB. */
export interface IHolding {
  user: Types.ObjectId;
  symbol: string;
  shares: number;
  /** Average purchase price per share. */
  costBasis: number;
  purchaseDate: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const HoldingSchema = new Schema<IHolding>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    symbol: { type: String, required: true, uppercase: true },
    shares: { type: Number, required: true, min: 0.0001 },
    costBasis: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date, required: true, default: Date.now },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

/** Allows multiple purchases of the same symbol for the same user. */
HoldingSchema.index({ user: 1, symbol: 1 });

export const Holding =
  mongoose.models.Holding ?? mongoose.model<IHolding>("Holding", HoldingSchema);
