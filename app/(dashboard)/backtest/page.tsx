import { BacktestForm } from "@/components/backtest-form";

export default function BacktestPage() {
  return (
    <main className="px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl font-bold">What If?</h1>
          <p className="mt-1 text-sm text-slate-400">
            Simulate buying a stock on any past date and see how it would have
            performed.
          </p>
        </div>

        <BacktestForm />
      </div>
    </main>
  );
}
