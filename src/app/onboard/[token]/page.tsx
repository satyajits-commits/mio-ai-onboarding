import { notFound } from "next/navigation";
import { Zap, Target, Globe, ShieldCheck, Headphones, BarChart3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { KnowledgeBase } from "@/lib/types";
import { MioMascot } from "@/components/mio-mascot";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { StartButton } from "./StartButton";
import { OnboardingPopup } from "./OnboardingPopup";

export const dynamic = "force-dynamic";

async function getLanding(token: string) {
  const link = await prisma.onboardingLink.findUnique({
    where: { token },
    include: { project: true },
  });
  if (!link) return null;
  let institutionName = link.project.name;
  if (link.project.knowledgeBase) {
    try {
      const kb = JSON.parse(link.project.knowledgeBase) as KnowledgeBase;
      institutionName = kb.institution_name || link.project.name;
    } catch {
      /* keep */
    }
  }
  return { institutionName };
}

const BENEFITS = [
  {
    icon: Zap,
    title: "24/7 Admissions Counsellor",
    body: "Answers applicant queries about programs, fees, and deadlines instantly — any hour, any day.",
  },
  {
    icon: Target,
    title: "Qualify Every Lead",
    body: "Captures intent, budget, and program fit so your team focuses on the hottest leads.",
  },
  {
    icon: Globe,
    title: "Speaks Their Language",
    body: "Natural, multilingual conversations that sound human and stay on-brand.",
  },
];

const FEATURES = [
  "Trained on your website's programs, fees & FAQs",
  "Inbound & outbound voice calls",
  "Live lead qualification & callback scheduling",
  "Seamless handoff to human counsellors",
  "Real-time analytics dashboard",
  "Zero-code setup — live in minutes",
];

export default async function OnboardLanding({
  params,
}: {
  params: { token: string };
}) {
  const data = await getLanding(params.token);
  if (!data) notFound();
  const { institutionName } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <span className="text-sm font-bold">M</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Mio AI</span>
        </div>
        <ThemeToggle />
      </nav>

      {/* Hero */}
      <section className="bg-grid">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 md:grid-cols-2 md:py-20">
          <div className="animate-fade-up">
            <Badge>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                AI
              </span>
              AI Voice Agent for Education
            </Badge>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Welcome to{" "}
              <span className="text-primary">Mio AI Voice</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Configure your AI Counsellor for{" "}
              <span className="font-medium text-foreground">
                {institutionName}
              </span>{" "}
              in just a few minutes. Mio calls, qualifies, and follows up with
              student leads — 24/7, in any language.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <StartButton />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The assistant will open in a moment to guide you through setup.
            </p>
          </div>

          {/* Mascot */}
          <div className="flex justify-center md:justify-end">
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-full bg-mio-200/40 blur-3xl dark:bg-mio-500/10" />
              <MioMascot size={300} />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Why institutions choose Mio AI
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="p-6 transition hover:shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mio-50 text-primary dark:bg-mio-900/40">
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features + demo */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything your admissions team needs
            </h2>
            <p className="mt-3 text-muted-foreground">
              One agent, fully trained on your institution, working every shift.
            </p>
            <ul className="mt-6 space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="glass p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Headphones className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold">Live Voice Demo</div>
                <div className="text-xs text-muted-foreground">
                  Generated after onboarding
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-end gap-1.5">
              {[20, 38, 28, 50, 34, 46, 24, 40, 30].map((h, i) => (
                <span
                  key={i}
                  className="w-2 rounded-full bg-primary/70 animate-wave"
                  style={{ height: h, animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Complete onboarding in the assistant to generate and test your live
              demo agent.
            </p>
          </Card>
        </div>
      </section>

      {/* Customer success */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Card className="p-10 text-center">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              [BarChart3, "3×", "more qualified leads"],
              [Zap, "<1 min", "average response time"],
              [Globe, "24/7", "always available"],
            ].map(([Icon, stat, label]) => {
              const I = Icon as typeof Zap;
              return (
                <div key={label as string}>
                  <I className="mx-auto h-6 w-6 text-primary" />
                  <div className="mt-2 text-4xl font-bold text-primary">
                    {stat as string}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {label as string}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-muted-foreground">
            &ldquo;Mio AI&apos;s voice agent transformed how we handle admission
            enquiries — our counsellors now focus only on serious
            applicants.&rdquo;
          </p>
        </Card>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Ready to build your agent?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Configure your AI Counsellor in just a few minutes.
        </p>
        <div className="mt-8 flex justify-center">
          <StartButton />
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © Mio AI · Voice Agent Onboarding
      </footer>

    
      <OnboardingPopup token={params.token} institution={institutionName} />
    </div>
  );
}
