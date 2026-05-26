import { TrendingUp } from "lucide-react";
import { getHoldingsWithPrices } from "@/lib/portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddHoldingDialog } from "@/components/add-holding-dialog";
import { HoldingRow } from "@/components/holding-row";

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

export default async function DashboardPage() {
  const holdings = await getHoldingsWithPrices();

  const totalValue = holdings.reduce(
    (sum, h) => sum + (h.isPriceUnavailable ? h.totalCost : h.currentValue),
    0
  );
  const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPct =
    totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const gainPositive = totalGainLoss >= 0;

  return (
    <main className="px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            className="animate-slide-up border-slate-800 bg-slate-900 text-white hover:border-slate-600 hover:shadow-lg hover:shadow-slate-950/50 transition-all duration-200"
            style={{ animationDelay: "0ms" }}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-slate-400">
                Total value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{fmt(totalValue)}</p>
            </CardContent>
          </Card>

          <Card
            className="animate-slide-up border-slate-800 bg-slate-900 text-white hover:border-slate-600 hover:shadow-lg hover:shadow-slate-950/50 transition-all duration-200"
            style={{ animationDelay: "100ms" }}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-slate-400">
                Total cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{fmt(totalCost)}</p>
            </CardContent>
          </Card>

          <Card
            className="animate-slide-up border-slate-800 bg-slate-900 text-white hover:border-slate-600 hover:shadow-lg hover:shadow-slate-950/50 transition-all duration-200"
            style={{ animationDelay: "200ms" }}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-slate-400">
                Gain / Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  gainPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {fmt(totalGainLoss)}{" "}
                <span className="text-lg">({fmtPct(totalGainLossPct)})</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Holdings section ── */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Holdings</h2>
          <AddHoldingDialog />
        </div>

        {holdings.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <TrendingUp className="h-10 w-10 text-slate-600" />
              <p className="text-base font-medium text-slate-300">
                Your portfolio is empty
              </p>
              <p className="text-sm text-slate-500">
                Add your first stock to start tracking performance
              </p>
              <div className="mt-2">
                <AddHoldingDialog />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-3 text-left font-medium text-slate-400">
                    Symbol
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">
                    Shares
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">
                    Avg cost
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">
                    Current price
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">
                    Value
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">
                    Gain / Loss
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, index) => (
                  <HoldingRow key={holding._id} holding={holding} index={index} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
