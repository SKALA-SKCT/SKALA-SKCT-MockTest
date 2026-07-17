"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attempts,
  exams,
  questions,
  responses,
  SECTION_MINUTES,
  SUBJECTS,
  type SectionState,
  type Subject,
} from "@/db/schema";
import { requireUser } from "@/lib/session";

const GRACE_MS = 30 * 1000;

/** 가장 최근 응시 */
async function getMyAttempt(userId: number, examId: number) {
  const [attempt] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.examId, examId)))
    .orderBy(desc(attempts.id))
    .limit(1);
  return attempt ?? null;
}

/** 응시 시작(없으면 생성). take 페이지 진입 시 호출 */
export async function startAttempt(examId: number) {
  const user = await requireUser();
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
  if (!exam || !exam.published) throw new Error("존재하지 않거나 비공개 시험입니다.");

  const existing = await getMyAttempt(user.id, examId);
  if (existing) return { attemptId: existing.id };

  const [created] = await db
    .insert(attempts)
    .values({ userId: user.id, examId })
    .returning();
  return { attemptId: created.id };
}

/** 과목 섹션 시작 — 타이머 기준 시각을 서버가 기록 */
export async function startSection(examId: number, subject: Subject) {
  const user = await requireUser();
  const attempt = await getMyAttempt(user.id, examId);
  if (!attempt || attempt.finishedAt) throw new Error("응시 상태가 아닙니다.");

  const state: SectionState = { ...attempt.sectionState };
  if (!state[subject]) {
    state[subject] = { startedAt: new Date().toISOString() };
    await db
      .update(attempts)
      .set({ sectionState: state })
      .where(eq(attempts.id, attempt.id));
  }
  return { sectionState: state };
}

function sectionActive(state: SectionState, subject: Subject): boolean {
  const s = state[subject];
  if (!s || s.finishedAt) return false;
  const endsAt =
    new Date(s.startedAt).getTime() + SECTION_MINUTES * 60 * 1000 + GRACE_MS;
  return Date.now() < endsAt;
}

/** 답안 저장(문항 단위 즉시 저장) */
export async function saveAnswer(
  examId: number,
  questionId: number,
  choice: number | null
) {
  const user = await requireUser();
  const attempt = await getMyAttempt(user.id, examId);
  if (!attempt || attempt.finishedAt) return { ok: false };

  const [q] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.examId, examId)));
  if (!q) return { ok: false };
  if (!sectionActive(attempt.sectionState, q.subject)) return { ok: false };

  const isCorrect = choice != null && choice === q.answer;
  await db
    .insert(responses)
    .values({ attemptId: attempt.id, questionId, choice, isCorrect })
    .onConflictDoUpdate({
      target: [responses.attemptId, responses.questionId],
      set: { choice, isCorrect },
    });
  return { ok: true };
}

/** 과목 섹션 종료(수동 제출 또는 시간 만료). 마지막 과목이면 응시 완료 처리 */
export async function finishSection(examId: number, subject: Subject) {
  const user = await requireUser();
  const attempt = await getMyAttempt(user.id, examId);
  if (!attempt || attempt.finishedAt)
    return { sectionState: attempt?.sectionState ?? {}, finished: !!attempt?.finishedAt };

  const state: SectionState = { ...attempt.sectionState };
  const s = state[subject];
  if (s && !s.finishedAt) {
    state[subject] = { ...s, finishedAt: new Date().toISOString() };
  }

  // 이 시험에 실제로 존재하는 과목들 기준으로 완주 여부 판단
  const examSubjects = await db
    .selectDistinct({ subject: questions.subject })
    .from(questions)
    .where(eq(questions.examId, examId));
  const allDone = examSubjects.every(
    (row) => state[row.subject as Subject]?.finishedAt
  );

  await db
    .update(attempts)
    .set({ sectionState: state, ...(allDone ? { finishedAt: new Date() } : {}) })
    .where(eq(attempts.id, attempt.id));

  return { sectionState: state, finished: allDone };
}

/** 시험에 존재하는 과목을 SKCT 순서대로 반환 */
export async function getExamSubjects(examId: number): Promise<Subject[]> {
  const rows = await db
    .selectDistinct({ subject: questions.subject })
    .from(questions)
    .where(eq(questions.examId, examId));
  const set = new Set(rows.map((r) => r.subject));
  return SUBJECTS.filter((s) => set.has(s));
}
