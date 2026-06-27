"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ---- Shared types (used by both the chat flow and the stepped wizard) ------

export interface Question {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, unknown>;
  note?: string;
}

export interface Flow {
  institution_name?: string;
  questions: Question[];
  agent: {
    languages: string[];
    persona: string;
    welcome_message: string;
    opening_line: string;
    closing_scripts: {
      successful?: string;
      not_interested?: string;
      busy?: string;
    };
    knowledge_base_links: unknown[];
    mandatory_fields: string[];
  };
  change_requests: unknown[];
}

export interface ConfigData {
  institution: string;
  status: string;
  flow: Flow;
  options: {
    languages: string[];
    personas: { value: string; title: string; description: string }[];
    courseOptions: string[];
    questionTypes: string[];
  };
}

export const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  yes_no: "Yes / No",
  single_select: "Single Select",
  multi_select: "Multi Select",
  number: "Number",
};

// ---- Controls -------------------------------------------------------------

export function EditableArea({
  value,
  onChange,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded-2xl border border-input bg-card p-4 text-sm leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
    />
  );
}

export function LanguagePicker({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (lang: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((lang) => {
        const active = selected.includes(lang);
        return (
          <button
            key={lang}
            onClick={() => onToggle(lang)}
            className={cn(
              "flex items-center justify-between rounded-2xl border p-4 text-left text-sm font-medium transition",
              active
                ? "border-primary bg-mio-50 text-primary shadow-soft dark:bg-mio-900/30"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            {lang}
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              )}
            >
              {active && <Check className="h-3 w-3" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PersonaPicker({
  options,
  value,
  onChange,
}: {
  options: { value: string; title: string; description: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map((p) => {
        const active = value === p.value;
        return (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={cn(
              "rounded-2xl border p-6 text-left transition",
              active
                ? "border-primary bg-mio-50 shadow-soft dark:bg-mio-900/30"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </span>
              {active && <Check className="h-5 w-5 text-primary" />}
            </div>
            <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export function QuestionBuilder({
  questions,
  questionTypes,
  onChange,
}: {
  questions: Question[];
  questionTypes: string[];
  onChange: (q: Question[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= questions.length) return;
    const next = [...questions];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  const update = (i: number, patch: Partial<Question>) =>
    onChange(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const remove = (i: number) => onChange(questions.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...questions,
      { id: `q_${Date.now()}`, label: "New question", type: "text", required: true },
    ]);

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div
          key={q.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
            setDragIndex(null);
          }}
          className={cn(
            "flex items-start gap-2 rounded-2xl border border-border bg-card p-3 transition",
            dragIndex === i && "opacity-50"
          )}
        >
          <div className="flex flex-col items-center pt-2 text-muted-foreground">
            <button
              onClick={() => move(i, i - 1)}
              className="hover:text-primary disabled:opacity-30"
              disabled={i === 0}
              aria-label="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <GripVertical className="h-4 w-4 cursor-grab" />
            <button
              onClick={() => move(i, i + 1)}
              className="hover:text-primary disabled:opacity-30"
              disabled={i === questions.length - 1}
              aria-label="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mio-50 text-xs font-semibold text-primary dark:bg-mio-900/40">
                {i + 1}
              </span>
              <input
                value={q.label}
                onChange={(e) => update(i, { label: e.target.value })}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-8">
              <select
                value={q.type}
                onChange={(e) => update(i, { type: e.target.value })}
                className="rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
              >
                {questionTypes.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t] || t}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                  className="accent-[hsl(var(--primary))]"
                />
                Required
              </label>
            </div>
          </div>

          <button
            onClick={() => remove(i)}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
            aria-label="Delete question"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        onClick={add}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Add New Question
      </button>
    </div>
  );
}

export function ClosingScripts({
  scripts,
  onChange,
}: {
  scripts: Flow["agent"]["closing_scripts"];
  onChange: (s: Flow["agent"]["closing_scripts"]) => void;
}) {
  const tones: Record<string, string> = {
    successful: "text-emerald-600 dark:text-emerald-400",
    not_interested: "text-amber-600 dark:text-amber-400",
    busy: "text-sky-600 dark:text-sky-400",
  };
  const labels: Record<string, string> = {
    successful: "Successful Completion",
    not_interested: "Not Interested",
    busy: "Busy",
  };
  return (
    <div className="space-y-4">
      {(["successful", "not_interested", "busy"] as const).map((k) => (
        <div key={k} className="rounded-2xl border border-border bg-card p-4">
          <div className={cn("mb-2 text-sm font-semibold", tones[k])}>
            {labels[k]}
          </div>
          <EditableArea
            value={scripts[k] || ""}
            onChange={(v) => onChange({ ...scripts, [k]: v })}
            rows={3}
          />
        </div>
      ))}
    </div>
  );
}
