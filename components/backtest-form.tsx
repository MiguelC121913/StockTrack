"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LineChart } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { simulateBacktest } from "@/app/actions/historical";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BacktestResult } from "@/types";

const TWO_YEARS_AGO = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().split("T")[0];
})();

const TODAY = new Date().toISOString().split("T")[0];

const FIVE_YEARS_AGO = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().split("T")[0];
})();

const PRESETS = [
  { label: "AAPL 5y ago", symbol: "AAPL", amount: "1000", date: FIVE_YEARS_AGO },
  { label: "NVDA AI boom", symbol: "NVDA", amount: "1000", date: "2022-11-01" },
  { label: "TSLA 3y ago", symbol: "TSLA", amount: "1000", date: (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 3); return d.toISOString().split("T")[0]; })() },
] as const;

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "long",
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
      <p className="text-slate-400">
        {new Date((label as string) + "T00:00:00Z").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })}
      </p>
      <p className="font-semibold text-white">{fmt(payload[0].value ?? 0)}</p>
    </div>
  );
}

export function BacktestForm() {
  const [symbol, setSymbol] = useState("AAPL");
  const [amount, setAmount] = useState("1000");
  const [purchaseDate, setPurchaseDate] = useState(TWO_YEARS_AGO);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isPending, startTransition] = useTransition();
  /** Defers Recharts render to client side only. */
  const [mounted] = useState(() => typeof window !== "undefined");

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setSymbol(preset.symbol);
    setAmount(preset.amount);
    setPurchaseDate(preset.date);
    setResult(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const res = await simulateBacktest({
        symbol,
        investedAmount: parseFloat(amount),
        purchaseDate,
      });
      if ("error" in res) {
        toast.error(res.error);
      } else {
        setResult(res);
      }
    });
  }

  const successResult =
    result && !("error" in result) ? result : null;

  // Portfolio value over time = invested × (close / purchasePrice)
  const valueData = successResult?.chartData.map((p) => ({
    date: p.date,
    value: (successResult.investedAmount * p.close) / successResult.purchasePrice,
  }));

  const positive = (successResult?.gainLoss ?? 0) >= 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── Form panel ── */}
      <div className="lg:w-2/5">
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="text-base">Run simulation</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Quick presets */}
            <div className="mb-5 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bt-symbol">Stock symbol</Label>
                <Input
                  id="bt-symbol"
                  placeholder="e.g. AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bt-amount">Amount invested (USD)</Label>
                <Input
                  id="bt-amount"
                  type="number"
                  placeholder="e.g. 1000"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bt-date">Purchase date</Label>
                <Input
                  id="bt-date"
                  type="date"
                  max={TODAY}
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Running…" : "Run simulation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── Result panel ── */}
      <div className="lg:w-3/5">
        {!successResult ? (
          <Card className="flex h-full min-h-64 items-center justify-center border-slate-800 bg-slate-900 text-white">
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <LineChart className="h-10 w-10 text-slate-600" />
              <p className="text-base font-medium text-slate-300">
                Try a backtest simulation
              </p>
              <p className="text-sm text-slate-500">
                See how an investment would have grown over time
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-slate-800 bg-slate-900 text-white">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium text-slate-400">
                    Final value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold tabular-nums">
                    {fmt(successResult.currentValue)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900 text-white">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium text-slate-400">
                    Gain / Loss
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-xl font-bold tabular-nums ${
                      positive ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {successResult.gainLossPercent.toFixed(1)}%
                  </p>
                  <p
                    className={`text-xs tabular-nums ${
                      positive ? "text-emerald-400/70" : "text-red-400/70"
                    }`}
                  >
                    {fmt(successResult.gainLoss)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900 text-white">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium text-slate-400">
                    CAGR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {successResult.cagr !== null ? (
                    <p
                      className={`text-xl font-bold tabular-nums ${
                        successResult.cagr >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {successResult.cagr >= 0 ? "+" : ""}
                      {successResult.cagr.toFixed(1)}%
                    </p>
                  ) : (
                    <p className="text-xl font-bold text-slate-500">—</p>
                  )}
                  <p className="text-xs text-slate-500">per year</p>
                </CardContent>
              </Card>
            </div>

            {/* Narrative */}
            <p className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-slate-300 border border-slate-800">
              If you had invested {fmt(successResult.investedAmount)} in{" "}
              <span className="font-semibold text-white">
                {successResult.symbol}
              </span>{" "}
              on {fmtDate(successResult.purchaseDate)}, you would have bought{" "}
              <span className="font-semibold text-white">
                {successResult.sharesEquivalent.toFixed(4)} shares
              </span>{" "}
              at {fmt(successResult.purchasePrice)} each. Today those shares are
              worth{" "}
              <span
                className={`font-semibold ${
                  positive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {fmt(successResult.currentValue)}
              </span>
              .
            </p>

            {/* Chart */}
            {mounted && valueData && valueData.length > 1 && (
              <div className="h-52 rounded-lg border border-slate-800 bg-slate-900 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={valueData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="btFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={positive ? "#10b981" : "#f87171"}
                          stopOpacity={0.18}
                        />
                        <stop
                          offset="95%"
                          stopColor={positive ? "#10b981" : "#f87171"}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) =>
                        new Date(v + "T00:00:00Z").toLocaleDateString("en-US", {
                          month: "short",
                          year: "2-digit",
                          timeZone: "UTC",
                        })
                      }
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    {/* Entry point: the invested amount */}
                    <ReferenceLine
                      y={successResult.investedAmount}
                      stroke="#64748b"
                      strokeDasharray="4 4"
                      label={{
                        value: "Entry",
                        fill: "#64748b",
                        fontSize: 10,
                        position: "insideTopLeft",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={positive ? "#10b981" : "#f87171"}
                      strokeWidth={2}
                      fill="url(#btFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: positive ? "#10b981" : "#f87171" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
