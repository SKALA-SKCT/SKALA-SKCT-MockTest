import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { SUBJECTS, type Subject } from "@/db/schema";
import { abandonAttempt, finishSection, saveAnswer, startQuestion, startSection } from "@/lib/actions/exam";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try {
    const url = origin ? new URL(origin) : null;
    sameOrigin = url !== null && url.host === request.headers.get("host") && url.protocol === request.nextUrl.protocol;
  } catch { sameOrigin = false; }
  if (!sameOrigin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const examId = Number((await params).id);
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (!body || typeof body !== "object" || !Number.isInteger(examId) || examId <= 0 ||
      !Number.isInteger(body.attemptId) || body.attemptId <= 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { action, attemptId, questionId, subject, choice } = body;
  if ((action === "startSection" || action === "finishSection") && !SUBJECTS.includes(subject)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if ((action === "saveAnswer" || action === "startQuestion") &&
      (!Number.isInteger(questionId) || questionId <= 0)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (action === "saveAnswer" && choice !== null && !Number.isInteger(choice)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    let result;
    switch (action) {
      case "startSection": result = await startSection(examId, subject as Subject, attemptId); break;
      case "finishSection": result = await finishSection(examId, subject as Subject, attemptId); break;
      case "startQuestion": result = await startQuestion(examId, questionId, attemptId); break;
      case "saveAnswer": result = await saveAnswer(examId, questionId, choice, attemptId); break;
      case "abandon": result = await abandonAttempt(examId, attemptId); break;
      default: return NextResponse.json({ ok: false }, { status: 400 });
    }
    const response = NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    if ((action === "finishSection" && "finished" in result && result.finished) ||
        (action === "abandon" && "ok" in result && result.ok)) response.cookies.delete("__vdpl");
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
