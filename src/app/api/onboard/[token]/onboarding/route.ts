import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedLink } from "@/lib/onboarding-session";
import {
  getOnboardingState,
  phraseQuestion,
  validateAnswer,
} from "@/lib/qualification/engine";
import {
  QualificationAnswers,
  QualificationFlow,
} from "@/lib/qualification/types";

export const dynamic = "force-dynamic";

async function loadFlow(projectId: string): Promise<QualificationFlow | null> {
  const flow = await prisma.qualificationFlow.findUnique({
    where: { projectId },
  });
  if (!flow) return null;
  return JSON.parse(flow.config) as QualificationFlow;
}

async function loadAnswers(linkId: string): Promise<{
  id: string | null;
  answers: QualificationAnswers;
}> {
  const resp = await prisma.qualificationResponse.findFirst({
    where: { linkId },
    orderBy: { createdAt: "desc" },
  });
  return {
    id: resp?.id ?? null,
    answers: resp ? (JSON.parse(resp.answers) as QualificationAnswers) : {},
  };
}

function stateResponse(
  flow: QualificationFlow,
  answers: QualificationAnswers,
  extra: Record<string, unknown> = {}
) {
  const state = getOnboardingState(flow, answers);
  return NextResponse.json({
    complete: state.complete,
    progress: state.progress,
    index: state.index,
    total: state.total,
    question: state.question
      ? {
          id: state.question.id,
          type: state.question.type,
          options: state.question.options || [],
          prompt: phraseQuestion(state.question, state.index, state.total),
        }
      : null,
    ...extra,
  });
}

// GET — current onboarding state (used to render the chat + resume).
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const link = await getAuthedLink(req, params.token);
  if (!link) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const flow = await loadFlow(link.projectId);
  if (!flow) {
    return NextResponse.json(
      { error: "no_flow", message: "Onboarding questionnaire isn't configured yet." },
      { status: 409 }
    );
  }
  const { answers } = await loadAnswers(link.id);
  return stateResponse(flow, answers, {
    resumed: Object.keys(answers).length > 0,
  });
}

// POST — submit an answer to the current question; advance to the next.
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const link = await getAuthedLink(req, params.token);
  if (!link) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const flow = await loadFlow(link.projectId);
  if (!flow) {
    return NextResponse.json(
      { error: "no_flow", message: "Onboarding questionnaire isn't configured yet." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const raw = body?.answer;

  const { id: respId, answers } = await loadAnswers(link.id);
  const state = getOnboardingState(flow, answers);

  if (state.complete) return stateResponse(flow, answers, { complete: true });

  const q = state.question!;
  const result = validateAnswer(q, raw);
  if (!result.ok) {
    // Re-ask the same question with the validation error.
    return stateResponse(flow, answers, { error: result.error });
  }

  answers[q.id] = result.value as QualificationAnswers[string];
  const serialized = JSON.stringify(answers);
  const after = getOnboardingState(flow, answers);

  if (respId) {
    await prisma.qualificationResponse.update({
      where: { id: respId },
      data: { answers: serialized, complete: after.complete },
    });
  } else {
    await prisma.qualificationResponse.create({
      data: { linkId: link.id, answers: serialized, complete: after.complete },
    });
  }

  await prisma.onboardingLink.update({
    where: { id: link.id },
    data: {
      progress: after.progress,
      status: after.complete ? "completed" : "in_progress",
    },
  });
  await prisma.sessionEvent.create({
    data: { linkId: link.id, kind: after.complete ? "complete" : "heartbeat" },
  });

  return stateResponse(flow, answers, {
    accepted: true,
    justCompleted: after.complete,
  });
}
