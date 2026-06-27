import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runScrapePipeline } from "@/lib/scrape";

export const dynamic = "force-dynamic";

// GET /api/projects — list all onboarding projects (newest first).
export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      url: true,
      status: true,
      kbSource: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ projects });
}

function normalizeUrl(input: string): string | null {
  let url = input.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// POST /api/projects — create a project and kick off the scrape pipeline.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rawUrl = body?.url as string | undefined;
  if (!rawUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  const url = normalizeUrl(rawUrl);
  if (!url) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const name =
    (body?.name as string | undefined)?.trim() ||
    new URL(url).hostname.replace(/^www\./, "");

  const project = await prisma.project.create({
    data: { name, url, status: "pending" },
  });

  // Fire-and-forget: run the pipeline in the background; UI polls for status.
  void runScrapePipeline(project.id);

  return NextResponse.json({ project }, { status: 201 });
}
