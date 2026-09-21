"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { questionReports, questions } from "@/db/schema";
import { requireUser } from "@/lib/session";

const ALLOWED_REASONS = new Set([
  "문제 내용 오류",
  "정답 오류",
  "해설 오류",
  "이미지·표시 오류",
  "기타",
]);

export async function submitQuestionReport(input: {
  examId: number;
  questionId: number;
  reasons: string[];
  detail: string;
}) {
  const user = await requireUser();
  const reasons = [...new Set(input.reasons)].filter((reason) => ALLOWED_REASONS.has(reason));
  const detail = input.detail.trim().slice(0, 1000);
  if (!Number.isInteger(input.examId) || !Number.isInteger(input.questionId) || reasons.length === 0) {
    return { ok: false, error: "신고 사유를 하나 이상 선택해주세요." };
  }
  const [question] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.id, input.questionId), eq(questions.examId, input.examId)));
  if (!question) return { ok: false, error: "문항을 찾을 수 없습니다." };

  await db.insert(questionReports).values({
    questionId: input.questionId,
    reporterId: user.id,
    reasons,
    detail: detail || null,
  });
  revalidatePath("/admin");
  return { ok: true };
}
