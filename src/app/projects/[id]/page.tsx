"use client";

import { useCallback, useEffect, useState } from "react";
import OnboardingPanel from "./OnboardingPanel";
import QualificationPanel from "./QualificationPanel";

interface ProjectDetail {
  id: string;
  name: string;
  url: string;
  status: string;
  error: string | null;
  kbSource: string | null;
  rawPages: { url: string; title: string; text: string }[] | null;
  knowledgeBase: any | null;
  createdAt: string;
  updatedAt: string;
}

const TERMINAL = new Set(["completed", "failed"]);

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [kbText, setKbText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"kb" | "pages">("kb");

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setProject(data.project);
    // Only refresh the editor text if user isn't mid-edit (kbText empty or terminal load).
    setKbText((prev) =>
      prev && data.project.status === "completed"
        ? prev
        : JSON.stringify(data.project.knowledgeBase, null, 2)
    );
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll until the pipeline reaches a terminal state.
  useEffect(() => {
    if (project && TERMINAL.has(project.status)) return;
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [project, load]);

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const parsed = JSON.parse(kbText);
      const res = await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgeBase: parsed }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Save failed");
      }
      setSaveMsg("Saved ✓");
    } catch (err) {
      setSaveMsg(
        err instanceof SyntaxError
          ? "Invalid JSON — fix before saving"
          : err instanceof Error
          ? err.message
          : "Save failed"
      );
    } finally {
      setSaving(false);
    }
  }

  async function rescrape() {
    await fetch(`/api/projects/${params.id}/rescrape`, { method: "POST" });
    setKbText("");
    load();
  }

  if (!project) {
    return <main className="text-muted-foreground">Loading…</main>;
  }

  const inProgress = !TERMINAL.has(project.status);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/" className="text-sm text-muted-foreground hover:text-muted-foreground">
            ← All projects
          </a>
          <h1 className="mt-1 text-xl font-semibold">{project.name}</h1>
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary/80 hover:text-primary"
          >
            {project.url}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={project.status} />
          <button
            onClick={rescrape}
            className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-primary"
          >
            Re-scrape
          </button>
        </div>
      </div>

      {inProgress && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
          {project.status === "scraping"
            ? "Scraping website pages…"
            : project.status === "structuring"
            ? "Building structured knowledge base…"
            : "Queued…"}
        </div>
      )}

      {project.status === "failed" && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <strong>Scrape failed:</strong> {project.error}
        </div>
      )}

      {project.status === "completed" && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <TabBtn active={tab === "kb"} onClick={() => setTab("kb")}>
              Knowledge Base
            </TabBtn>
            <TabBtn active={tab === "pages"} onClick={() => setTab("pages")}>
              Scraped Pages ({project.rawPages?.length || 0})
            </TabBtn>
            {project.kbSource && (
              <span className="ml-auto rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                generated via {project.kbSource}
              </span>
            )}
          </div>

          {tab === "kb" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Review and edit the generated knowledge base. This JSON feeds the
                Voice Agent prompt in later phases.
              </p>
              <textarea
                value={kbText}
                onChange={(e) => setKbText(e.target.value)}
                spellCheck={false}
                className="h-[60vh] w-full rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed outline-none focus:border-primary"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-medium shadow-lg shadow-glow disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Knowledge Base"}
                </button>
                {saveMsg && (
                  <span className="text-sm text-muted-foreground">{saveMsg}</span>
                )}
              </div>
            </div>
          )}

          {tab === "pages" && (
            <div className="space-y-3">
              {project.rawPages?.map((p, i) => (
                <details
                  key={i}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <summary className="cursor-pointer text-sm font-medium">
                    {p.title}
                    <span className="ml-2 text-xs text-muted-foreground">{p.url}</span>
                  </summary>
                  <p className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                    {p.text.slice(0, 4000)}
                    {p.text.length > 4000 ? "…" : ""}
                  </p>
                </details>
              ))}
            </div>
          )}

          <QualificationPanel projectId={project.id} />
          <OnboardingPanel projectId={project.id} />
        </>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    scraping: "bg-amber-500/20 text-amber-300",
    structuring: "bg-sky-500/20 text-sky-300",
    completed: "bg-emerald-500/20 text-emerald-300",
    failed: "bg-rose-500/20 text-rose-300",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs ${styles[status] || ""}`}>
      {status}
    </span>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 ${
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground/80"
      }`}
    >
      {children}
    </button>
  );
}
