"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createHolding } from "@/app/actions/holdings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const todayISO = () => new Date().toISOString().split("T")[0];

export function AddHoldingDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO);
  const [notes, setNotes] = useState("");

  function reset() {
    setSymbol("");
    setShares("");
    setCostBasis("");
    setPurchaseDate(todayISO());
    setNotes("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createHolding({
        symbol,
        shares: parseFloat(shares),
        costBasis: parseFloat(costBasis),
        purchaseDate,
        notes: notes || undefined,
      });
      if (result.success) {
        toast.success("Holding added");
        setOpen(false);
        reset();
      } else {
        toast.error(result.error ?? "Failed to add holding");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add holding</Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Add Holding</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ah-symbol">Symbol</Label>
              <Input
                id="ah-symbol"
                placeholder="e.g. AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                required
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ah-shares">Shares</Label>
              <Input
                id="ah-shares"
                type="number"
                placeholder="e.g. 10"
                min="0.0001"
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ah-cost">Avg cost per share ($)</Label>
              <Input
                id="ah-cost"
                type="number"
                placeholder="e.g. 180"
                min="0"
                step="any"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ah-date">Purchase date</Label>
              <Input
                id="ah-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ah-notes">Notes (optional)</Label>
              <Input
                id="ah-notes"
                placeholder="e.g. Long-term hold"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adding…" : "Add holding"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
