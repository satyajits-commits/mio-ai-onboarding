import {
  QualificationAnswers,
  QualificationFlow,
  QualificationQuestion,
} from "./types";

export interface OnboardingState {
  question: QualificationQuestion | null; // next unanswered question (null = done)
  index: number; // 1-based position of the current question
  total: number;
  progress: number; // 0..100
  complete: boolean;
  answers: QualificationAnswers;
}

function isUnanswered(a: unknown): boolean {
  return (
    a === undefined ||
    a === null ||
    a === "" ||
    (Array.isArray(a) && a.length === 0)
  );
}

// Questions are asked in order; the next one is the first without an answer.
export function nextQuestionIndex(
  flow: QualificationFlow,
  answers: QualificationAnswers
): number {
  for (let i = 0; i < flow.questions.length; i++) {
    if (isUnanswered(answers[flow.questions[i].id])) return i;
  }
  return flow.questions.length; // all answered
}

export function computeProgress(
  flow: QualificationFlow,
  answers: QualificationAnswers
): number {
  const total = flow.questions.length || 1;
  const answered = flow.questions.filter(
    (q) => !isUnanswered(answers[q.id])
  ).length;
  return Math.round((answered / total) * 100);
}

export function getOnboardingState(
  flow: QualificationFlow,
  answers: QualificationAnswers
): OnboardingState {
  const total = flow.questions.length;
  const idx = nextQuestionIndex(flow, answers);
  const complete = idx >= total;
  return {
    question: complete ? null : flow.questions[idx],
    index: Math.min(idx + 1, total),
    total,
    progress: computeProgress(flow, answers),
    complete,
    answers,
  };
}

export interface ValidationResult {
  ok: boolean;
  value?: string | number | boolean | string[];
  error?: string;
}

// Validate + coerce a raw answer against a question's type and rules.
export function validateAnswer(
  q: QualificationQuestion,
  raw: unknown
): ValidationResult {
  const v = q.validation || {};

  switch (q.type) {
    case "yes_no": {
      if (typeof raw === "boolean") return { ok: true, value: raw };
      const s = String(raw).trim().toLowerCase();
      if (["yes", "y", "true", "yeah", "yep", "sure"].includes(s))
        return { ok: true, value: true };
      if (["no", "n", "false", "nope", "nah"].includes(s))
        return { ok: true, value: false };
      return { ok: false, error: "Please answer Yes or No." };
    }

    case "number": {
      const n = Number(String(raw).replace(/[^0-9.\-]/g, ""));
      if (Number.isNaN(n)) return { ok: false, error: "Please enter a number." };
      if (v.min !== undefined && n < v.min)
        return { ok: false, error: `Must be at least ${v.min}.` };
      if (v.max !== undefined && n > v.max)
        return { ok: false, error: `Must be at most ${v.max}.` };
      return { ok: true, value: n };
    }

    case "single_select": {
      const s = String(raw).trim();
      if (!s) return { ok: false, error: "Please choose an option." };
      if (q.options?.length) {
        const match = q.options.find((o) => o.toLowerCase() === s.toLowerCase());
        return { ok: true, value: match || s };
      }
      return { ok: true, value: s };
    }

    case "multi_select": {
      const arr = Array.isArray(raw)
        ? raw.map(String)
        : String(raw)
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
      if (q.required && arr.length === 0)
        return { ok: false, error: "Please select at least one option." };
      return { ok: true, value: arr };
    }

    case "text":
    default: {
      const s = String(raw ?? "").trim();
      if (q.required && !s) return { ok: false, error: "This field is required." };
      if (v.minLength && s.length < v.minLength)
        return { ok: false, error: `Must be at least ${v.minLength} characters.` };
      if (v.maxLength && s.length > v.maxLength)
        return { ok: false, error: `Must be at most ${v.maxLength} characters.` };
      if (v.pattern && !new RegExp(v.pattern).test(s))
        return { ok: false, error: v.patternMessage || "Invalid format." };
      return { ok: true, value: s };
    }
  }
}

// A friendly, conversational way to ask a question (one at a time).
export function phraseQuestion(
  q: QualificationQuestion,
  index: number,
  total: number
): string {
  const lead =
    index === 1 ? "To get started, " : index === total ? "Last one — " : "";
  let body = q.label.trim().replace(/\s+/g, " ");
  if (!/[?]$/.test(body)) {
    if (q.type === "yes_no") body = `${body}?`;
    else body = `What's your ${body.toLowerCase()}?`;
  }
  // Capitalise after the lead-in for non-empty leads.
  if (lead && index !== 1 && index !== total) body = body;
  return `${lead}${body}`;
}
