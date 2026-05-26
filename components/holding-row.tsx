"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteHolding } from "@/app/actions/holdings";
import { Button } from "@/components/ui/button";
import { SymbolChartDialog } from "@/components/symbol-chart-dialog";
import { useConfirm } from "@/hooks/use-confirm";
import type { HoldingWithPrice } from "@/types";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function HoldingRow({ holding, index = 0 }: { holding: HoldingWithPrice; index?: number }) {
  const [chartOpen, setChartOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirm, ConfirmDialog] = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete holding?",
      message: `Remove ${holding.symbol} from your portfolio. This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteHolding(holding._id);
      if (result.success) {
        toast.success(`${holding.symbol} removed from portfolio`);
      } else {
        toast.error(result.error ?? "Failed to delete holding");
      }
    });
  }

  const positive = holding.gainLoss >= 0;

  return (
    <tr
      className="animate-slide-in-right border-b border-slate-800 hover:bg-slate-900/40 transition-colors"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <td className="px-4 py-3">
        <button
          onClick={() => setChartOpen(true)}
          className="font-semibold tracking-wide hover:text-emerald-400 transition-colors cursor-pointer"
        >
          {holding.symbol}
        </button>
        {/* Portal renders at document body — safe inside a <td>. */}
        <SymbolChartDialog
          open={chartOpen}
          onOpenChange={setChartOpen}
          symbol={holding.symbol}
        />
      </td>

      <td className="px-4 py-3 text-right tabular-nums">{holding.shares}</td>

      <td className="px-4 py-3 text-right tabular-nums">
        {fmt(holding.costBasis)}
      </td>

      <td className="px-4 py-3 text-right tabular-nums">
        {holding.isPriceUnavailable ? (
          <span className="text-slate-500">—</span>
        ) : (
          fmt(holding.currentPrice)
        )}
      </td>

      <td className="px-4 py-3 text-right tabular-nums">
        {holding.isPriceUnavailable ? (
          <span className="text-slate-500">—</span>
        ) : (
          fmt(holding.currentValue)
        )}
      </td>

      <td
        className={`px-4 py-3 text-right tabular-nums ${
          holding.isPriceUnavailable
            ? "text-slate-500"
            : positive
            ? "text-emerald-400"
            : "text-red-400"
        }`}
      >
        {holding.isPriceUnavailable
          ? "—"
          : `${fmt(holding.gainLoss)} (${fmtPct(holding.gainLossPercent)})`}
      </td>

      <td className="px-4 py-3 text-right">
        <Button
          variant="destructive"
          size="xs"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? "…" : "Delete"}
        </Button>
        {ConfirmDialog}
      </td>
    </tr>
  );
}
