import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generatePassword,
  generateToken,
  hashPassword,
} from "@/lib/auth";
import { credentialsEmail, sendEmail } from "@/lib/email";
import { emptyKnowledgeBase, KnowledgeBase } from "@/lib/types";

export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

// GET — return the onboarding link + login/session history for the Ops panel.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const link = await prisma.onboardingLink.findUnique({
    where: { projectId: params.id },
    include: {
      logins: { orderBy: { createdAt: "desc" }, take: 20 },
      sessions: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!link) return NextResponse.json({ link: null });
  return NextResponse.json({
    link: {
      token: link.token,
      url: `${baseUrl(req)}/onboard/${link.token}`,
      email: link.email,
      status: link.status,
      progress: link.progress,
      credentialsSentAt: link.credentialsSentAt,
      createdAt: link.createdAt,
      logins: link.logins,
      sessions: link.sessions,
    },
  });
}

// POST — generate (or regenerate) the onboarding link + credentials and "send".
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  // Ops may supply the customer email; otherwise a placeholder is used.
  const email: string =
    (body?.email as string | undefined)?.trim() ||
    `onboarding+${project.id.slice(-6)}@example.com`;

  const token = generateToken();
  const password = generatePassword();
  const passwordHash = hashPassword(password);

  const link = await prisma.onboardingLink.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      token,
      email,
      passwordHash,
      status: "invited",
    },
    update: {
      token,
      email,
      passwordHash,
      status: "invited",
      progress: 0,
    },
  });

  const url = `${baseUrl(req)}/onboard/${link.token}`;

  // Resolve institution name for the email body.
  let institutionName = project.name;
  if (project.knowledgeBase) {
    try {
      const kb = JSON.parse(project.knowledgeBase) as KnowledgeBase;
      institutionName = kb.institution_name || project.name;
    } catch {
      institutionName = project.name;
    }
  }
  if (!institutionName) institutionName = emptyKnowledgeBase().institution_name;

  await sendEmail(credentialsEmail({ institutionName, url, email, password }));
  await prisma.onboardingLink.update({
    where: { id: link.id },
    data: { credentialsSentAt: new Date() },
  });

  // Return the plaintext password ONCE so Ops can share it if needed.
  return NextResponse.json({
    link: { url, email, password, token: link.token },
  });
}
