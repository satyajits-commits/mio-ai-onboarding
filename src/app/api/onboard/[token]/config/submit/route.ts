import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedLink } from "@/lib/onboarding-session";
import { normalizeFlow } from "@/lib/onboarding-defaults";
import { QualificationFlow } from "@/lib/qualification/types";
import { KnowledgeBase } from "@/lib/types";

export const dynamic = "force-dynamic";

// POST — final submission of the onboarding configuration (Confirm screen).
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const link = await getAuthedLink(req, params.token);
  if (!link) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Persist the final flow if provided.
  if (body?.flow) {
    let institution = link.project.name;
    if (link.project.knowledgeBase) {
      try {
        institution =
          (JSON.parse(link.project.knowledgeBase) as KnowledgeBase)
            .institution_name || link.project.name;
      } catch {
        /* ignore */
      }
    }
    const flow = normalizeFlow(body.flow as QualificationFlow, institution);
    await prisma.qualificationFlow.upsert({
      where: { projectId: link.projectId },
      create: {
        projectId: link.projectId,
        config: JSON.stringify(flow),
        source: "customer",
      },
      update: { config: JSON.stringify(flow), source: "customer" },
    });
  }

  await prisma.onboardingLink.update({
    where: { id: link.id },
    data: { status: "completed", progress: 100 },
  });
  await prisma.sessionEvent.create({
    data: { linkId: link.id, kind: "complete" },
  });

  return NextResponse.json({ ok: true });
}
