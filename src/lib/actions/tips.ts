"use server";

import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { attempts, exams, questions, questionTips, questionTipLikes, questionReports, users } from "@/db/schema";
import { examHistoryIds } from "@/db/linkareer-catalog";
import { ensureQuestionTipsSchema } from "@/db/ensure-question-tips";
import { requireUser } from "@/lib/session";
import { hitRateLimit } from "@/lib/rate-limit";
import { TIP_MAX, TIP_REPORT_REASONS, validTipText, type QuestionTip } from "@/lib/question-tip";

async function accessQuestion(questionId: number, userId: number) {
  if (!Number.isSafeInteger(questionId) || questionId <= 0) return false;
  const [question] = await db.select({ examId: questions.examId }).from(questions)
    .innerJoin(exams, eq(exams.id, questions.examId))
    .where(and(eq(questions.id, questionId), eq(exams.published, true)));
  if (!question) return false;
  const [attempt] = await db.select({ id: attempts.id }).from(attempts)
    .where(and(eq(attempts.userId, userId), inArray(attempts.examId, examHistoryIds(question.examId)), isNotNull(attempts.finishedAt))).limit(1);
  return Boolean(attempt);
}

export async function loadQuestionTips(questionId: number) {
  const user = await requireUser();
  if (!await accessQuestion(questionId, user.id)) return { ok: false as const, error: "완료한 시험의 문항에서 풀이팁을 확인할 수 있어요." };
  await ensureQuestionTipsSchema();
  const rows = await db.select({
    id: questionTips.id, questionId: questionTips.questionId, userId: questionTips.userId,
    name: users.name, text: questionTips.text, createdAt: questionTips.createdAt,
    likes: sql<number>`(select count(*)::int from question_tip_likes l where l.tip_id = ${questionTips.id})`,
    liked: sql<boolean>`exists(select 1 from question_tip_likes l where l.tip_id = ${questionTips.id} and l.user_id = ${user.id})`,
    reported: sql<boolean>`exists(select 1 from question_reports r where r.tip_id = ${questionTips.id} and r.reporter_id = ${user.id})`,
  }).from(questionTips).innerJoin(users, eq(users.id, questionTips.userId))
    .where(eq(questionTips.questionId, questionId)).orderBy(desc(questionTips.createdAt), desc(questionTips.id));
  const tips: QuestionTip[] = rows.map(({ userId, ...row }) => ({ ...row, id: String(row.id), createdAt: row.createdAt.toISOString(), mine: userId === user.id }));
  return { ok: true as const, tips };
}

export async function createQuestionTip(questionId: number, text: string) {
  const user = await requireUser();
  if (!validTipText(text)) return { ok: false, error: "풀이팁을 1~1000자로 입력해주세요." };
  if (!await accessQuestion(questionId, user.id)) return { ok: false, error: "문항에 접근할 수 없어요." };
  // ponytail: 인스턴스별 제한입니다. 다중 서버의 도배 대응이 필요하면 공유 저장소 제한으로 교체합니다.
  if (hitRateLimit(`tip:create:${user.id}`, 10, 60_000)) return { ok: false, error: "잠시 후 다시 등록해주세요." };
  await ensureQuestionTipsSchema();
  await db.insert(questionTips).values({ questionId, userId: user.id, text: text.trim() });
  return { ok: true };
}

export async function likeQuestionTip(tipId: number, liked: boolean) {
  const user = await requireUser();
  if (!Number.isSafeInteger(tipId) || tipId <= 0 || typeof liked !== "boolean") return { ok: false, error: "잘못된 요청이에요." };
  await ensureQuestionTipsSchema();
  const [tip] = await db.select().from(questionTips).where(eq(questionTips.id, tipId));
  if (!tip || !await accessQuestion(tip.questionId, user.id)) return { ok: false, error: "풀이팁을 찾을 수 없어요." };
  if (liked) await db.insert(questionTipLikes).values({ tipId, userId: user.id }).onConflictDoNothing();
  else await db.delete(questionTipLikes).where(and(eq(questionTipLikes.tipId, tipId), eq(questionTipLikes.userId, user.id)));
  return { ok: true };
}

export async function deleteQuestionTip(tipId: number) {
  const user = await requireUser();
  if (!Number.isSafeInteger(tipId) || tipId <= 0) return { ok: false, error: "잘못된 요청이에요." };
  await ensureQuestionTipsSchema();
  const deleted = await db.delete(questionTips).where(and(eq(questionTips.id, tipId), eq(questionTips.userId, user.id))).returning({ id: questionTips.id });
  if (!deleted.length) return { ok: false, error: "내가 작성한 풀이팁만 삭제할 수 있어요." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function reportQuestionTip(tipId: number, reason: string, detail: string) {
  const user = await requireUser();
  if (!Number.isSafeInteger(tipId) || tipId <= 0 || !TIP_REPORT_REASONS.includes(reason) || typeof detail !== "string" || detail.length > TIP_MAX) return { ok: false, error: "신고 사유와 상세 내용을 확인해주세요." };
  await ensureQuestionTipsSchema();
  const [tip] = await db.select({ id: questionTips.id, questionId: questionTips.questionId, userId: questionTips.userId, text: questionTips.text, author: users.name }).from(questionTips)
    .innerJoin(users, eq(users.id, questionTips.userId)).where(eq(questionTips.id, tipId));
  if (!tip || tip.userId === user.id || !await accessQuestion(tip.questionId, user.id)) return { ok: false, error: "신고할 풀이팁을 찾을 수 없어요." };
  await db.insert(questionReports).values({ questionId: tip.questionId, reporterId: user.id, tipId, tipText: tip.text, tipAuthor: tip.author, reasons: [reason], detail: detail.trim() || null }).onConflictDoNothing();
  revalidatePath("/admin");
  return { ok: true };
}
