import mongoose, { Schema, Types } from "mongoose";

const PortfolioSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, default: "My Portfolio" },
  },
  { timestamps: true }
);

export const Portfolio =
  mongoose.models.Portfolio ?? mongoose.model("Portfolio", PortfolioSchema);
