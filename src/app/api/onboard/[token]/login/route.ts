import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  signSession,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

// POST /api/onboard/:token/login — validate email + password (Phase 6).
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const body = await req.json().catch(() => null);
  const email = (body?.email as string | undefined)?.trim().toLowerCase();
  const password = body?.password as string | undefined;

  const link = await prisma.onboardingLink.findUnique({
    where: { token: params.token },
  });
  if (!link) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const ok =
    !!email &&
    !!password &&
    email === link.email.toLowerCase() &&
    verifyPassword(password, link.passwordHash);

  await prisma.loginEvent.create({
    data: { linkId: link.id, success: ok },
  });

  if (!ok) {
    return NextResponse.json(
      { error: "Incorrect email or password" },
      { status: 401 }
    );
  }

  // Record a session start (or resume if already in progress).
  await prisma.sessionEvent.create({
    data: {
      linkId: link.id,
      kind: link.status === "in_progress" ? "resume" : "start",
    },
  });
  if (link.status === "invited") {
    await prisma.onboardingLink.update({
      where: { id: link.id },
      data: { status: "in_progress" },
    });
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const session = signSession({ linkId: link.id, token: link.token, exp });

  const res = NextResponse.json({
    ok: true,
    progress: link.progress,
    resumed: link.status === "in_progress",
  });
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
