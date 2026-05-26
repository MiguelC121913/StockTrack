import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/signout-button";
import { NavLinks } from "@/components/nav-links";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    redirect("/signin");
  }
  if (!session) redirect("/signin");

  const { name, email, image } = session.user;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          {image && (
            <Image
              src={image}
              alt={name ?? "User avatar"}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none">{name}</p>
            <p className="mt-0.5 text-xs text-slate-400">{email}</p>
          </div>

          <div className="flex-1" />

          <NavLinks />
          <SignOutButton />
        </div>
      </header>

      {children}
    </div>
  );
}
