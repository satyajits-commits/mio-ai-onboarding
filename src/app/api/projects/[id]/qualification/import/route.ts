import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { parseQualificationWorkbook } from "@/lib/qualification/parser";
import { KnowledgeBase } from "@/lib/types";

export const dynamic = "force-dynamic";

// Default bundled prerequisites workbook (used for the demo when no file is
// uploaded). Swap per-institution by uploading their own file.
const BUNDLED_PREREQS = "prereqs-jecrc.xlsx";

// POST — parse a prerequisites workbook into the qualification flow.
// Accepts either a multipart upload (field "file") or, with no file, falls
// back to the bundled demo workbook.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Pull course options + institution name from the knowledge base if present.
  let courseOptions: string[] | undefined;
  let institutionName = project.name;
  if (project.knowledgeBase) {
    try {
      const kb = JSON.parse(project.knowledgeBase) as KnowledgeBase;
      institutionName = kb.institution_name || project.name;
      const names = (kb.programs || [])
        .map((p) => p.program_name)
        .filter(Boolean);
      if (names.length) courseOptions = Array.from(new Set(names));
    } catch {
      /* ignore */
    }
  }

  // Resolve the workbook bytes.
  let buffer: Buffer;
  let sourceFile = BUNDLED_PREREQS;
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file && file instanceof File) {
        buffer = Buffer.from(await file.arrayBuffer());
        sourceFile = file.name;
      } else {
        buffer = await readFile(path.join(process.cwd(), BUNDLED_PREREQS));
      }
    } else {
      buffer = await readFile(path.join(process.cwd(), BUNDLED_PREREQS));
    }
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Could not read prerequisites workbook. Upload a .xlsx or ensure the bundled file exists.",
      },
      { status: 400 }
    );
  }

  let flow;
  try {
    flow = await parseQualificationWorkbook(buffer, {
      institutionName,
      courseOptions,
      sourceFile,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse failed" },
      { status: 400 }
    );
  }

  const stored = await prisma.qualificationFlow.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      config: JSON.stringify(flow),
      source: "imported",
    },
    update: { config: JSON.stringify(flow), source: "imported" },
  });

  return NextResponse.json({
    flow: { ...stored, config: flow },
    summary: {
      questions: flow.questions.length,
      languages: flow.agent.languages,
      kbLinks: flow.agent.knowledge_base_links.length,
      changeRequests: flow.change_requests.length,
    },
  });
}
