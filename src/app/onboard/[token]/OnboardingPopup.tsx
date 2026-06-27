"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, MessageCircle, X } from "lucide-react";
import { MioMascot } from "@/components/mio-mascot";
import { Button } from "@/components/ui/button";
import type { ConfigData } from "@/components/onboarding/controls";
import { ChatFlow } from "./configure/ChatFlow";

type Phase = "loading" | "login" | "ready";

// Floating chat popup that runs the entire B2B onboarding on the landing page.
export function OnboardingPopup({
  token,
  institution,
}: {
  token: string;
  institution: string;
}) {
  const [open, setOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<ConfigData | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setPhase("loading");
    const res = await fetch(`/api/onboard/${token}/config`);
    if (res.status === 401) {
      setPhase("login");
      return;
    }
    setData(await res.json());
    setPhase("ready");
  }, [token]);

  // Load config the first time the popup opens.
  useEffect(() => {
    if (open && !data && phase !== "login") loadConfig();
  }, [open, data, phase, loadConfig]);

  // Auto-launch after 5s, and respond to the "Start Onboarding" CTA.
  useEffect(() => {
    const openNow = () => {
      setLaunching(false);
      setOpen(true);
    };
    window.addEventListener("mio:start-onboarding", openNow);
    const t = setTimeout(() => {
      setLaunching(true);
      setTimeout(() => {
        setLaunching(false);
        setOpen(true);
      }, 1400);
    }, 5000);
    return () => {
      window.removeEventListener("mio:start-onboarding", openNow);
      clearTimeout(t);
    };
  }, []);

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

  return (
    <>
      {launching && !open && (
        <div className="fixed bottom-24 right-6 z-50 animate-bounce rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow">
          Let&apos;s build your AI Voice Agent
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition hover:scale-105"
        aria-label="Open onboarding chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[min(86vh,720px)] w-[min(460px,94vw)] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-[0_24px_70px_-12px_rgba(2,6,23,0.4)]">
          {phase === "loading" && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {phase === "login" && (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
                <span className="text-sm font-semibold">Mio Onboarding Assistant</span>
                <button onClick={() => setOpen(false)} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <MioMascot size={120} withWaves={false} />
                <h2 className="mt-3 text-lg font-bold">Sign in to configure</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use the email and password from your invitation.
                </p>
                <form onSubmit={login} className="mt-5 w-full space-y-2.5">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                  {error && <p className="text-sm text-rose-500">{error}</p>}
                  <Button type="submit" disabled={busy} className="w-full">
                    <Lock className="h-4 w-4" />
                    {busy ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {phase === "ready" && data && (
            <ChatFlow
              token={token}
              data={data}
              embedded
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      )}
    </>
  );
}
