"use client";

import { useCallback, useEffect, useState } from "react";

interface LinkInfo {
  url: string;
  email: string;
  status: string;
  progress: number;
  credentialsSentAt: string | null;
  logins: { id: string; success: boolean; createdAt: string }[];
  sessions: { id: string; kind: string; createdAt: string }[];
}

export default function OnboardingPanel({ projectId }: { projectId: string }) {
  const [link, setLink] = useState<LinkInfo | null>(null);
  const [email, setEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [oneTimePassword, setOneTimePassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/onboarding-link`);
    const data = await res.json();
    setLink(data.link);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setGenerating(true);
    setOneTimePassword(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/onboarding-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setOneTimePassword(data.link.password);
        await load();
      }
    } finally {
      setGenerating(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Customer Onboarding Link</h3>
          <p className="text-xs text-muted-foreground">
            Generate a secured link + credentials and send them to the customer.
          </p>
        </div>
        {link && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {link.status} · {link.progress}%
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={link?.email || "customer@institution.edu"}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {generating
            ? "Generating…"
            : link
            ? "Regenerate"
            : "Generate Link"}
        </button>
      </div>

      {link && (
        <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted p-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">URL:</span>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-primary hover:underline"
            >
              {link.url}
            </a>
            <button
              onClick={() => copy(link.url)}
              className="ml-auto rounded border border-border px-2 py-0.5 text-xs hover:border-primary"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span>{" "}
            <span className="font-mono">{link.email}</span>
          </div>
          {oneTimePassword && (
            <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-200">
              Password (shown once):{" "}
              <span className="font-mono font-semibold">{oneTimePassword}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Credentials{" "}
            {link.credentialsSentAt ? "sent (see email outbox)" : "not yet sent"}
          </div>
        </div>
      )}

      {link && (link.logins.length > 0 || link.sessions.length > 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
              Login history
            </div>
            <div className="space-y-1 text-xs">
              {link.logins.slice(0, 6).map((l) => (
                <div key={l.id} className="flex justify-between">
                  <span className={l.success ? "text-emerald-400" : "text-rose-400"}>
                    {l.success ? "success" : "failed"}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(l.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
              Session history
            </div>
            <div className="space-y-1 text-xs">
              {link.sessions.slice(0, 6).map((s) => (
                <div key={s.id} className="flex justify-between">
                  <span className="text-sky-300">{s.kind}</span>
                  <span className="text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
