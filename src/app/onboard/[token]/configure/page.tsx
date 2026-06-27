"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { MioMascot } from "@/components/mio-mascot";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatFlow } from "./ChatFlow";
import type { ConfigData } from "@/components/onboarding/controls";

type Phase = "loading" | "login" | "wizard";

export default function ConfigurePage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<ConfigData | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const res = await fetch(`/api/onboard/${token}/config`);
    if (res.status === 401) {
      setPhase("login");
      return;
    }
    const d = await res.json();
    setData(d);
    setPhase("wizard");
  }, [token]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/onboard/${token}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Login failed");
      await loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (phase === "login") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
          <Link href={`/onboard/${token}`} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
              <span className="text-sm font-bold">M</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Mio AI</span>
          </Link>
          <ThemeToggle />
        </nav>
        <div className="flex flex-1 items-center justify-center px-5 pb-20">
          <Card className="w-full max-w-md p-8">
            <div className="mb-4 flex justify-center">
              <MioMascot size={140} withWaves={false} />
            </div>
            <h1 className="text-center text-2xl font-bold tracking-tight">
              Sign in to configure
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Use the registered email and password from your invitation.
            </p>
            <form onSubmit={login} className="mt-6 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              {error && <p className="text-sm text-rose-500">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                <Lock className="h-4 w-4" />
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return <ChatFlow token={token} data={data!} />;
}
