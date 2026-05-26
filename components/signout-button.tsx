"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ callbackUrl: "/signin" })}
      className="border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
