import { NextResponse, type NextRequest } from "next/server";
import { deleteUnfinishedAttempts } from "@/lib/actions/exam";
import { getSessionUserId } from "@/lib/session";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const examId = Number(id);
  if (!Number.isInteger(examId) || examId <= 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await deleteUnfinishedAttempts(userId, examId);
  return NextResponse.json({ ok: true });
}
