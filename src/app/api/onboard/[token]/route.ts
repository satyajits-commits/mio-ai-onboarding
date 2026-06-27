import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { KnowledgeBase } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/onboard/:token — public, non-sensitive data for the landing page.
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const link = await prisma.onboardingLink.findUnique({
    where: { token: params.token },
    include: { project: true },
  });
  if (!link) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  let institutionName = link.project.name;
  if (link.project.knowledgeBase) {
    try {
      const kb = JSON.parse(link.project.knowledgeBase) as KnowledgeBase;
      institutionName = kb.institution_name || link.project.name;
    } catch {
      /* keep project name */
    }
  }

  return NextResponse.json({
    institutionName,
    status: link.status,
    progress: link.progress,
    // never expose email/password/hash
  });
}
