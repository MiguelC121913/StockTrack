import Link from "next/link";
import { LineChart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3">
          <LineChart className="h-12 w-12 text-emerald-400" />
          <h1 className="text-5xl font-bold tracking-tight text-white">
            StockTrack
          </h1>
        </div>

        <p className="max-w-md text-lg text-slate-400">
          Track your stock portfolio with real-time data and backtesting
        </p>

        <Link
          href="/signin"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-2 bg-emerald-500 hover:bg-emerald-600 text-white"
          )}
        >
          Sign in with Google
        </Link>
      </div>
    </main>
  );
}
