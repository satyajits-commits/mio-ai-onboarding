import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runScrapePipeline } from "@/lib/scrape";

export const dynamic = "force-dynamic";

// POST /api/projects/:id/rescrape — re-run the scrape + structure pipeline.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.project.update({
    where: { id: params.id },
    data: { status: "pending", error: null },
  });
  void runScrapePipeline(project.id);
  return NextResponse.json({ ok: true });
}
