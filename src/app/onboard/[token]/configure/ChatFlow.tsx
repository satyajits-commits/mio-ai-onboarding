"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudUpload,
  PartyPopper,
  Pencil,
  X,
} from "lucide-react";
import { MioMascot } from "@/components/mio-mascot";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  ClosingScripts,
  ConfigData,
  EditableArea,
  Flow,
  LanguagePicker,
  PersonaPicker,
  Question,
  QuestionBuilder,
  TYPE_LABELS,
} from "@/components/onboarding/controls";

const STEP_TITLES = [
  "Languages",
  "Agent Persona",
  "Welcome Message",
  "Reason for Call",
  "Qualification Questions",
  "Closing Scripts",
  "Review",
  "Confirm",
];
const TOTAL = STEP_TITLES.length;

export function ChatFlow({
  token,
  data,
  embedded = false,
  onClose,
}: {
  token: string;
  data: ConfigData;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const [flow, setFlow] = useState<Flow>(data.flow);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(data.status === "completed");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Autosave (debounced)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaving(true);
    const t = setTimeout(async () => {
      await fetch(`/api/onboard/${token}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow }),
      }).catch(() => {});
      setSaving(false);
    }, 700);
    return () => clearTimeout(t);
  }, [flow, token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [step, flow]);

  const setAgent = (patch: Partial<Flow["agent"]>) =>
    setFlow((f) => ({ ...f, agent: { ...f.agent, ...patch } }));

  // ---- Conversation copy --------------------------------------------------
  const prompts: string[] = [
    `Hi! I'm Mio, your onboarding assistant. 👋 Let's set up your AI Voice Agent for ${data.institution}. First — what are your preferred languages? Pick two or more.`,
    `Great choice! Which role should your agent focus on?`,
    `Here's a welcome message your agent will open calls with. Edit it to match your team's tone.`,
    `Perfect. And how should the agent explain why it's calling?`,
    `These are the questions your agent will ask each student lead. Add, edit, remove, or drag to reorder them.`,
    `Almost done — set how your agent signs off for each call outcome.`,
    `Here's everything together. Take a look, and tap Edit on anything you'd like to change.`,
    `Ready to submit your configuration to the Mio team?`,
  ];

  function summary(i: number): string {
    switch (i) {
      case 0:
        return flow.agent.languages.join(", ");
      case 1:
        return flow.agent.persona;
      case 2:
        return flow.agent.welcome_message;
      case 3:
        return flow.agent.opening_line;
      case 4:
        return `${flow.questions.length} questions configured`;
      case 5:
        return "Closing scripts saved";
      case 6:
        return "Looks good 👍";
      default:
        return "";
    }
  }

  const canContinue = (() => {
    if (step === 0) return flow.agent.languages.length >= 2;
    if (step === 1) return !!flow.agent.persona;
    if (step === 4) return flow.questions.length > 0;
    return true;
  })();

  async function submit() {
    setSubmitting(true);
    await fetch(`/api/onboard/${token}/config/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flow }),
    }).catch(() => {});
    setSubmitting(false);
    setDone(true);
  }

  if (done)
    return (
      <SuccessScreen
        token={token}
        institution={data.institution}
        embedded={embedded}
        onClose={onClose}
      />
    );

  const wrap = embedded ? "w-full px-4" : "mx-auto max-w-2xl px-5";
  const rootCls = embedded
    ? "flex h-full flex-col bg-background"
    : "flex min-h-screen flex-col bg-background";

  // Active control for the current step.
  const control = (() => {
    switch (step) {
      case 0:
        return (
          <LanguagePicker
            options={data.options.languages}
            selected={flow.agent.languages}
            onToggle={(lang) =>
              setAgent({
                languages: flow.agent.languages.includes(lang)
                  ? flow.agent.languages.filter((l) => l !== lang)
                  : [...flow.agent.languages, lang],
              })
            }
          />
        );
      case 1:
        return (
          <PersonaPicker
            options={data.options.personas}
            value={flow.agent.persona}
            onChange={(v) => setAgent({ persona: v })}
          />
        );
      case 2:
        return (
          <EditableArea
            value={flow.agent.welcome_message}
            onChange={(v) => setAgent({ welcome_message: v })}
          />
        );
      case 3:
        return (
          <EditableArea
            value={flow.agent.opening_line}
            onChange={(v) => setAgent({ opening_line: v })}
          />
        );
      case 4:
        return (
          <QuestionBuilder
            questions={flow.questions}
            questionTypes={data.options.questionTypes}
            onChange={(questions) => setFlow((f) => ({ ...f, questions }))}
          />
        );
      case 5:
        return (
          <ClosingScripts
            scripts={flow.agent.closing_scripts}
            onChange={(closing_scripts) => setAgent({ closing_scripts })}
          />
        );
      case 6:
        return <ReviewCard flow={flow} goto={setStep} />;
      default:
        return null;
    }
  })();

  return (
    <div className={rootCls}>
      {/* Header */}
      <header className="z-20 shrink-0 border-b border-border bg-background/85 backdrop-blur">
        <div className={`${wrap} py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MioMascot size={embedded ? 36 : 44} withWaves={false} />
              <div>
                <div className="text-sm font-semibold">Mio Onboarding Assistant</div>
                <div className="-mt-0.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  online
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <CloudUpload className="h-3.5 w-3.5" />
                {saving ? "Saving…" : "Saved"}
              </span>
              <ThemeToggle />
              {embedded && onClose && (
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
              Step {step + 1} of {TOTAL}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${((step + 1) / TOTAL) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <span className="whitespace-nowrap text-xs font-medium">
              {STEP_TITLES[step]}
            </span>
          </div>
        </div>
      </header>

      {/* Conversation */}
      <main ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className={`${wrap} space-y-5 py-6`}>
          {Array.from({ length: step }).map((_, i) => (
            <div key={i} className="space-y-3">
              <BotBubble text={prompts[i]} />
              {summary(i) && <UserBubble text={summary(i)} />}
            </div>
          ))}

          {/* Current step */}
          <div className="space-y-3">
            <BotBubble text={prompts[step]} />
            {control && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pl-11"
              >
                {control}
                {step === 0 && flow.agent.languages.length < 2 && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Please select at least two languages.
                  </p>
                )}
              </motion.div>
            )}
            {step === 7 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 pl-11 pt-2"
              >
                <MioMascot size={150} />
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Composer / nav */}
      <footer className="shrink-0 border-t border-border bg-background/85 backdrop-blur">
        <div className={`${wrap} flex items-center justify-between py-4`}>
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {step < 7 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
              {step === 6 ? "Looks good" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(6)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button onClick={submit} disabled={submitting}>
                <Check className="h-4 w-4" />
                {submitting ? "Submitting…" : "Confirm & Submit"}
              </Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

// ---- Bubbles --------------------------------------------------------------

function BotBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        M
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-card px-4 py-2.5 text-sm shadow-card">
        {text}
      </div>
    </motion.div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-end"
    >
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {text}
      </div>
    </motion.div>
  );
}

// ---- Review ----------------------------------------------------------------

function ReviewCard({ flow, goto }: { flow: Flow; goto: (n: number) => void }) {
  const Row = ({
    title,
    stepIndex,
    children,
  }: {
    title: string;
    stepIndex: number;
    children: React.ReactNode;
  }) => (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          onClick={() => goto(stepIndex)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );

  return (
    <div className="space-y-3">
      <Row title="Languages" stepIndex={0}>
        <div className="flex flex-wrap gap-1.5">
          {flow.agent.languages.map((l) => (
            <span
              key={l}
              className="rounded-full bg-mio-50 px-2.5 py-0.5 text-xs font-medium text-primary dark:bg-mio-900/40"
            >
              {l}
            </span>
          ))}
        </div>
      </Row>
      <Row title="Agent Persona" stepIndex={1}>
        {flow.agent.persona}
      </Row>
      <Row title="Welcome Message" stepIndex={2}>
        {flow.agent.welcome_message}
      </Row>
      <Row title="Reason for Call" stepIndex={3}>
        {flow.agent.opening_line}
      </Row>
      <Row title={`Questions (${flow.questions.length})`} stepIndex={4}>
        <ol className="list-decimal space-y-1 pl-5">
          {flow.questions.map((q: Question) => (
            <li key={q.id}>
              {q.label}{" "}
              <span className="text-xs text-muted-foreground/70">
                ({TYPE_LABELS[q.type] || q.type})
              </span>
            </li>
          ))}
        </ol>
      </Row>
      <Row title="Closing Scripts" stepIndex={5}>
        <div className="space-y-1.5">
          <p><b>Successful:</b> {flow.agent.closing_scripts.successful}</p>
          <p><b>Not Interested:</b> {flow.agent.closing_scripts.not_interested}</p>
          <p><b>Busy:</b> {flow.agent.closing_scripts.busy}</p>
        </div>
      </Row>
    </div>
  );
}

// ---- Success --------------------------------------------------------------

function SuccessScreen({
  token,
  institution,
  embedded,
  onClose,
}: {
  token: string;
  institution: string;
  embedded?: boolean;
  onClose?: () => void;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-background px-5 text-center ${
        embedded ? "h-full" : "min-h-screen"
      }`}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
      >
        <MioMascot size={embedded ? 150 : 220} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <PartyPopper className="h-4 w-4" />
          Submitted
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Thank you!</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          We have received your onboarding request for{" "}
          <span className="font-medium text-foreground">{institution}</span>. Our
          team will connect with you shortly to launch your AI Voice Agent.
        </p>
        <div className="mt-8">
          {embedded && onClose ? (
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          ) : (
            <Link href={`/onboard/${token}`}>
              <Button variant="outline">Back to home</Button>
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
