"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Holding } from "@/models/Holding";
import type { HoldingDoc } from "@/types";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

/** Returns all holdings for the signed-in user, sorted by symbol. */
export async function getMyHoldings(): Promise<HoldingDoc[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  await connectDB();

  const docs = await Holding.find({ user: session.user.id })
    .sort({ symbol: 1 })
    .lean();

  return docs.map((d) => ({
    _id: String(d._id),
    user: String(d.user),
    symbol: d.symbol,
    shares: d.shares,
    costBasis: d.costBasis,
    purchaseDate: d.purchaseDate.toISOString(),
    notes: d.notes,
    createdAt: d.createdAt?.toISOString() ?? "",
    updatedAt: d.updatedAt?.toISOString() ?? "",
  }));
}

/** Creates a new holding for the signed-in user. */
export async function createHolding(data: {
  symbol: string;
  shares: number;
  costBasis: number;
  purchaseDate: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const { symbol, shares, costBasis, purchaseDate, notes } = data;

    const upperSymbol = symbol.trim().toUpperCase();
    if (!upperSymbol) return { success: false, error: "Symbol is required" };
    if (!isFinite(shares) || shares <= 0)
      return { success: false, error: "Shares must be greater than 0" };
    if (!isFinite(costBasis) || costBasis < 0)
      return { success: false, error: "Cost basis must be 0 or greater" };

    await connectDB();
    await Holding.create({
      user: session.user.id,
      symbol: upperSymbol,
      shares,
      costBasis,
      purchaseDate: new Date(purchaseDate),
      notes: notes?.trim() || undefined,
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("createHolding error:", err);
    return { success: false, error: "Failed to create holding" };
  }
}

/**
 * Deletes a holding that belongs to the signed-in user.
 * The `user` filter prevents one user from deleting another user's holdings.
 */
export async function deleteHolding(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();
    await connectDB();

    const result = await Holding.deleteOne({ _id: id, user: session.user.id });
    if (result.deletedCount === 0)
      return { success: false, error: "Holding not found" };

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("deleteHolding error:", err);
    return { success: false, error: "Failed to delete holding" };
  }
}

/** Partially updates a holding that belongs to the signed-in user. */
export async function updateHolding(
  id: string,
  data: {
    shares?: number;
    costBasis?: number;
    purchaseDate?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();
    const patch: Record<string, unknown> = {};

    if (data.shares !== undefined) {
      if (!isFinite(data.shares) || data.shares <= 0)
        return { success: false, error: "Shares must be greater than 0" };
      patch.shares = data.shares;
    }
    if (data.costBasis !== undefined) {
      if (!isFinite(data.costBasis) || data.costBasis < 0)
        return { success: false, error: "Cost basis must be 0 or greater" };
      patch.costBasis = data.costBasis;
    }
    if (data.purchaseDate) patch.purchaseDate = new Date(data.purchaseDate);
    if (data.notes !== undefined) patch.notes = data.notes.trim() || undefined;

    await connectDB();
    const result = await Holding.updateOne(
      { _id: id, user: session.user.id },
      { $set: patch }
    );
    if (result.matchedCount === 0)
      return { success: false, error: "Holding not found" };

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("updateHolding error:", err);
    return { success: false, error: "Failed to update holding" };
  }
}
