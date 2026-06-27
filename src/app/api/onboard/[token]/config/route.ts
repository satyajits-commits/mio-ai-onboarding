import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedLink } from "@/lib/onboarding-session";
import {
  LANGUAGE_OPTIONS,
  PERSONA_OPTIONS,
  defaultFlow,
  normalizeFlow,
} from "@/lib/onboarding-defaults";
import { KnowledgeBase } from "@/lib/types";
import { QualificationFlow } from "@/lib/qualification/types";

export const dynamic = "force-dynamic";

function institutionOf(project: { name: string; knowledgeBase: string | null }) {
  if (project.knowledgeBase) {
    try {
      const kb = JSON.parse(project.knowledgeBase) as KnowledgeBase;
      return kb.institution_name || project.name;
    } catch {
      /* ignore */
    }
  }
  return project.name;
}

// GET — the agent configuration the B2B customer edits (seeded from the
// imported flow, or sensible defaults). Plus the option lists for the wizard.
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const link = await getAuthedLink(req, params.token);
  if (!link) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const institution = institutionOf(link.project);
  const existing = await prisma.qualificationFlow.findUnique({
    where: { projectId: link.projectId },
  });

  let flow: QualificationFlow;
  if (existing) {
    flow = normalizeFlow(JSON.parse(existing.config) as QualificationFlow, institution);
  } else {
    flow = defaultFlow(institution);
  }

  // Course options for single-select questions, pulled from the KB programs.
  let courseOptions: string[] = [];
  if (link.project.knowledgeBase) {
    try {
      const kb = JSON.parse(link.project.knowledgeBase) as KnowledgeBase;
      courseOptions = Array.from(
        new Set((kb.programs || []).map((p) => p.program_name).filter(Boolean))
      );
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    institution,
    status: link.status,
    flow,
    options: {
      languages: LANGUAGE_OPTIONS,
      personas: PERSONA_OPTIONS,
      courseOptions,
      questionTypes: ["text", "yes_no", "single_select", "multi_select", "number"],
    },
  });
}

// PUT — autosave the edited configuration.
export async function PUT(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const link = await getAuthedLink(req, params.token);
  if (!link) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.flow) {
    return NextResponse.json({ error: "flow is required" }, { status: 400 });
  }

  const institution = institutionOf(link.project);
  const flow = normalizeFlow(body.flow as QualificationFlow, institution);
  const config = JSON.stringify(flow);

  await prisma.qualificationFlow.upsert({
    where: { projectId: link.projectId },
    create: { projectId: link.projectId, config, source: "customer" },
    update: { config, source: "customer" },
  });

  return NextResponse.json({ ok: true });
}
