"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart } from "lucide-react";

export default function SignInPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 px-4">
      <Card className="w-full max-w-sm border-slate-800 bg-slate-900 text-white">
        <CardHeader className="items-center gap-2 text-center">
          <LineChart className="h-8 w-8 text-emerald-400" />
          <CardTitle className="text-2xl">Sign in to StockTrack</CardTitle>
          <CardDescription className="text-slate-400">
            Use your Google account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            size="lg"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
