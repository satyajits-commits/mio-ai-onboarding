"use client";

import { useCallback, useEffect, useState } from "react";

interface Question {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, unknown>;
  note?: string;
}

interface Flow {
  institution_name?: string;
  questions: Question[];
  agent: {
    languages: string[];
    persona: string;
    welcome_message: string;
    opening_line: string;
    closing_scripts: Record<string, string>;
    knowledge_base_links: { category: string; source: string; label: string }[];
    mandatory_fields: string[];
  };
  change_requests: {
    order: string;
    title: string;
    detail: string;
    status: string;
  }[];
}

const TYPE_STYLES: Record<string, string> = {
  text: "bg-sky-500/20 text-sky-300",
  number: "bg-violet-500/20 text-violet-300",
  yes_no: "bg-emerald-500/20 text-emerald-300",
  single_select: "bg-amber-500/20 text-amber-300",
  multi_select: "bg-pink-500/20 text-pink-300",
};

export default function QualificationPanel({
  projectId,
}: {
  projectId: string;
}) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/qualification`);
    const data = await res.json();
    setFlow(data.flow?.config || null);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function importFlow(file?: File) {
    setImporting(true);
    setMsg(null);
    try {
      const opts: RequestInit = { method: "POST" };
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        opts.body = fd;
      }
      const res = await fetch(
        `/api/projects/${projectId}/qualification/import`,
        opts
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setFlow(data.flow.config);
      setMsg(
        `Imported ${data.summary.questions} questions · ${data.summary.changeRequests} change requests`
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function save() {
    setMsg(null);
    try {
      const config = JSON.parse(draft);
      const res = await fetch(`/api/projects/${projectId}/qualification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      setFlow(config);
      setEditing(false);
      setMsg("Saved ✓");
    } catch (err) {
      setMsg(
        err instanceof SyntaxError
          ? "Invalid JSON"
          : err instanceof Error
          ? err.message
          : "Save failed"
      );
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Lead Qualification Flow</h3>
          <p className="text-xs text-muted-foreground">
            Generated from the prerequisites workbook — drives the onboarding
            chat (Phase 7) and the voice-agent prompt (Phase 9).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs hover:border-primary">
            Upload .xlsx
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && importFlow(e.target.files[0])
              }
            />
          </label>
          <button
            onClick={() => importFlow()}
            disabled={importing}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium disabled:opacity-50"
          >
            {importing
              ? "Generating…"
              : flow
              ? "Regenerate from file"
              : "Generate from prerequisites"}
          </button>
        </div>
      </div>

      {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}

      {!flow && !importing && (
        <p className="mt-4 text-sm text-muted-foreground">
          No qualification flow yet. Generate one from the bundled prerequisites
          file or upload an institution-specific workbook.
        </p>
      )}

      {flow && !editing && (
        <div className="mt-5 space-y-6">
          {/* Agent config summary */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Languages" value={flow.agent.languages.join(", ") || "—"} />
            <Info label="Persona" value={flow.agent.persona || "—"} />
            <Info label="Welcome message" value={flow.agent.welcome_message || "—"} />
            <Info label="Opening line" value={flow.agent.opening_line || "—"} />
          </div>

          {/* Questions table */}
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Questions ({flow.questions.length})
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Question</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Req</th>
                    <th className="px-3 py-2 font-medium">Validation / Options</th>
                  </tr>
                </thead>
                <tbody>
                  {flow.questions.map((q, i) => (
                    <tr key={q.id} className="border-t border-border align-top">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">{q.label}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            TYPE_STYLES[q.type] || "bg-muted"
                          }`}
                        >
                          {q.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {q.required ? "✓" : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {q.options?.length
                          ? q.options.join(", ")
                          : q.validation
                          ? Object.entries(q.validation)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Change requests */}
          {flow.change_requests.length > 0 && (
            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Flow change requests ({flow.change_requests.length})
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {flow.change_requests.slice(0, 8).map((cr) => (
                  <li key={cr.order} className="flex gap-2">
                    <span className="text-muted-foreground">{cr.order}</span>
                    <span className="flex-1">{cr.detail.slice(0, 140)}</span>
                    <span
                      className={
                        /not updated/i.test(cr.status)
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }
                    >
                      {cr.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => {
              setDraft(JSON.stringify(flow, null, 2));
              setEditing(true);
            }}
            className="rounded-lg border border-border px-4 py-2 text-xs hover:border-primary"
          >
            Edit flow (JSON)
          </button>
        </div>
      )}

      {flow && editing && (
        <div className="mt-4 space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="h-[50vh] w-full rounded-xl border border-border bg-background p-4 font-mono text-xs outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground/80">{value}</div>
    </div>
  );
}
