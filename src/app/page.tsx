"use client";

import { useEffect, useState } from "react";
import { Globe, Plus, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProjectRow {
  id: string;
  name: string;
  url: string;
  status: string;
  kbSource: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  scraping: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  structuring: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
};

export default function Home() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects || []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setUrl("");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30";

  return (
    <main className="space-y-8">
      <Card className="p-6">
        <h1 className="text-xl font-semibold tracking-tight">
          New Onboarding Project
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a college/university website URL. We&apos;ll scrape it and build
          a structured knowledge base automatically.
        </p>
        <form
          onSubmit={create}
          className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.university.edu"
            required
            className={inputCls}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name (optional)"
            className={inputCls}
          />
          <Button type="submit" disabled={submitting}>
            <Plus className="h-4 w-4" />
            {submitting ? "Starting…" : "Scrape & Build"}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Projects
        </h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Institution</th>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">KB Source</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No projects yet. Create one above.
                  </td>
                </tr>
              )}
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border transition hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-primary"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {p.url.replace(/^https?:\/\//, "").slice(0, 36)}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        STATUS_STYLES[p.status] || "bg-muted"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.kbSource || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/projects/${p.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary"
                    >
                      Review <ArrowRight className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </main>
  );
}
