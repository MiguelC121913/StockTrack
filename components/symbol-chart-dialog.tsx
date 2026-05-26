"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { getHistoricalForSymbol, type ChartRange } from "@/app/actions/historical";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HistoricalPoint } from "@/types";

const RANGES: ChartRange[] = ["1M", "3M", "1Y", "5Y", "ALL"];

function formatXTick(dateStr: string, range: ChartRange): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (range === "1M") {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  if (range === "3M") {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function formatTooltipDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-slate-800 px-3 py-2 text-sm ring-1 ring-slate-700">
      <p className="text-slate-400">{formatTooltipDate(label as string)}</p>
      <p className="font-semibold text-white">
        ${(payload[0].value ?? 0).toFixed(2)}
      </p>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
}

export function SymbolChartDialog({ open, onOpenChange, symbol }: Props) {
  const [range, setRange] = useState<ChartRange>("1M");
  const [data, setData] = useState<HistoricalPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  /** Defers Recharts render to client to avoid SSR mismatch. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !symbol) return;
    setLoading(true);
    setData(null);

    getHistoricalForSymbol(symbol, range)
      .then((result) => {
        setData(result?.data ?? null);
      })
      .finally(() => setLoading(false));
  }, [open, symbol, range]);

  // Downsample to at most 300 points for performance (even "1M" is ~22 points,
  // but "ALL" can be 5000+).
  const displayData: HistoricalPoint[] =
    data && data.length > 300
      ? data.filter((_, i) => i % Math.ceil(data.length / 300) === 0)
      : (data ?? []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="sm:max-w-4xl w-full"
      >
        <DialogHeader>
          <DialogTitle>
            {symbol} — Historical Price
          </DialogTitle>
        </DialogHeader>

        {/* Range selector */}
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                range === r
                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart area */}
        <div className="h-72 animate-scale-in">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-full w-full animate-pulse rounded-lg bg-slate-800/60" />
            </div>
          ) : !mounted || !data || data.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-500">
                {data !== null
                  ? "Historical data unavailable"
                  : "Loading…"}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={displayData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatXTick(v as string, range)}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#chartFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
