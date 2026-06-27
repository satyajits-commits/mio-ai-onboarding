import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/projects/:id — full project incl. raw pages + knowledge base.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    project: {
      ...project,
      rawPages: project.rawPages ? JSON.parse(project.rawPages) : null,
      knowledgeBase: project.knowledgeBase
        ? JSON.parse(project.knowledgeBase)
        : null,
    },
  });
}

// PATCH /api/projects/:id — Ops Team edits the generated knowledge base.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body?.knowledgeBase) {
    return NextResponse.json(
      { error: "knowledgeBase is required" },
      { status: 400 }
    );
  }
  try {
    // Validate it's serializable JSON.
    const serialized = JSON.stringify(body.knowledgeBase);
    const project = await prisma.project.update({
      where: { id: params.id },
      data: { knowledgeBase: serialized },
    });
    return NextResponse.json({ ok: true, updatedAt: project.updatedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 400 }
    );
  }
}
