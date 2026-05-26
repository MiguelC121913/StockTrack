import mongoose, { Schema } from "mongoose";

// Mirrors the NextAuth users collection — strict: false allows NextAuth fields
const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String },
    image: { type: String },
    emailVerified: { type: Date, default: null },
  },
  { strict: false }
);

export const User =
  mongoose.models.User ?? mongoose.model("User", UserSchema);
