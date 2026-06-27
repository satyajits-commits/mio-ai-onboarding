import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — the stored qualification flow for a project.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const flow = await prisma.qualificationFlow.findUnique({
    where: { projectId: params.id },
  });
  if (!flow) return NextResponse.json({ flow: null });
  return NextResponse.json({
    flow: { ...flow, config: JSON.parse(flow.config) },
  });
}

// PATCH — Ops edits the generated flow (questions, validation, agent config).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body?.config) {
    return NextResponse.json({ error: "config is required" }, { status: 400 });
  }
  try {
    const config = JSON.stringify(body.config);
    const flow = await prisma.qualificationFlow.update({
      where: { projectId: params.id },
      data: { config, source: "edited" },
    });
    return NextResponse.json({ ok: true, updatedAt: flow.updatedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 400 }
    );
  }
}
