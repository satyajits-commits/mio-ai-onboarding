import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Resolve the authenticated onboarding link for a request, ensuring the signed
// session cookie matches the URL token. Returns null if unauthenticated.
export async function getAuthedLink(req: NextRequest, token: string) {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySession(cookie);
  if (!session || session.token !== token) return null;

  const link = await prisma.onboardingLink.findUnique({
    where: { token },
    include: { project: true },
  });
  if (!link || link.id !== session.linkId) return null;
  return link;
}
