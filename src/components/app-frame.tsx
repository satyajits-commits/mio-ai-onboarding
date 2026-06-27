"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

// Customer-facing routes render full-bleed (their own chrome). Internal Ops
// routes get the constrained shell with the header.
const PUBLIC_PREFIXES = ["/onboard", "/start"];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublic) return <>{children}</>;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <span className="text-sm font-bold">M</span>
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">MIO AI</div>
            <div className="-mt-1 text-xs text-muted-foreground">
              Onboarding Console
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Operations Team
          </span>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
