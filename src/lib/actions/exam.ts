"use server";

import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
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

function isValidId(value: number) {
  return Number.isInteger(value) && value > 0;
}

function isSubject(value: string): value is Subject {
  return SUBJECTS.includes(value as Subject);
}

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

async function assertExamOrderAllowed(userId: number, examId: number) {
  const orderedExams = await db
    .select({ id: exams.id })
    .from(exams)
    .where(eq(exams.published, true))
    .orderBy(asc(exams.createdAt));
  const targetIndex = orderedExams.findIndex((exam) => exam.id === examId);
  if (targetIndex < 0) throw new Error("존재하지 않거나 비공개 시험입니다.");
  if (targetIndex === 0) return;

  const requiredExamIds = orderedExams
    .slice(0, targetIndex)
    .map((exam) => exam.id);
  const finishedPrevious = await db
    .select({ examId: attempts.examId })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), isNotNull(attempts.finishedAt)));
  const finishedExamIds = new Set(finishedPrevious.map((row) => row.examId));
  const missingIndex = requiredExamIds.findIndex(
    (requiredExamId) => !finishedExamIds.has(requiredExamId)
  );
  if (missingIndex >= 0) {
    throw new Error(`${missingIndex + 1}회차를 먼저 완료해주세요.`);
  }
}

export async function deleteUnfinishedAttempts(userId: number, examId: number) {
  const unfinishedAttempts = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.examId, examId),
        isNull(attempts.finishedAt)
      )
    );
  const attemptIds = unfinishedAttempts.map((attempt) => attempt.id);
  if (attemptIds.length === 0) return;

  await db.delete(responses).where(inArray(responses.attemptId, attemptIds));
  await db.delete(attempts).where(inArray(attempts.id, attemptIds));
}

/** 응시 시작. 기존 미완료 기록은 버리고 항상 새로 시작한다. */
export async function startAttempt(examId: number) {
  const user = await requireUser();
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
  if (!exam || !exam.published) throw new Error("존재하지 않거나 비공개 시험입니다.");

  await assertExamOrderAllowed(user.id, examId);

  await deleteUnfinishedAttempts(user.id, examId);

  const [created] = await db
    .insert(attempts)
    .values({ userId: user.id, examId })
    .returning();
  return { attemptId: created.id };
}

/** 과목 섹션 시작 — 타이머 기준 시각을 서버가 기록 */
export async function startSection(examId: number, subject: Subject) {
  if (!isValidId(examId) || !isSubject(subject)) {
    throw new Error("잘못된 응시 요청입니다.");
  }
  const user = await requireUser();
  const attempt = await getMyAttempt(user.id, examId);
  if (!attempt || attempt.finishedAt) throw new Error("응시 상태가 아닙니다.");

  const examSubjects = await getExamSubjects(examId);
  const targetIndex = examSubjects.indexOf(subject);
  if (targetIndex < 0) throw new Error("시험에 없는 유형입니다.");
  const firstOpenSubject = examSubjects.find(
    (item) => !attempt.sectionState[item]?.finishedAt
  );
  if (firstOpenSubject !== subject) throw new Error("유형은 순서대로 응시해야 합니다.");

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

async function closeOpenQuestionTimers(attemptId: number) {
  const now = new Date();
  const openResponses = await db
    .select({
      id: responses.id,
      startedAt: responses.questionStartedAt,
      timeSpentSeconds: responses.timeSpentSeconds,
    })
    .from(responses)
    .where(
      and(
        eq(responses.attemptId, attemptId),
        isNotNull(responses.questionStartedAt)
      )
    );

  for (const response of openResponses) {
    const additionalSeconds = response.startedAt
      ? Math.max(0, Math.round((now.getTime() - response.startedAt.getTime()) / 1000))
      : 0;
    await db
      .update(responses)
      .set({
        timeSpentSeconds: response.timeSpentSeconds + additionalSeconds,
        questionStartedAt: null,
        answeredAt: now,
      })
      .where(eq(responses.id, response.id));
  }
}

/** 문항을 처음 열었을 때 시작 시각 저장 */
export async function startQuestion(examId: number, questionId: number) {
  if (!isValidId(examId) || !isValidId(questionId)) return { ok: false };
  const user = await requireUser();
  const attempt = await getMyAttempt(user.id, examId);
  if (!attempt || attempt.finishedAt) return { ok: false };

  const [q] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.examId, examId)));
  if (!q || !sectionActive(attempt.sectionState, q.subject)) return { ok: false };

  // 자유 이동 시 현재까지의 각 문항 체류 구간을 닫고 다음 문항을 시작한다.
  await closeOpenQuestionTimers(attempt.id);

  const startedAt = new Date();
  await db
    .insert(responses)
    .values({
      attemptId: attempt.id,
      questionId,
      choice: null,
      isCorrect: false,
      timeSpentSeconds: 0,
      questionStartedAt: startedAt,
    })
    .onConflictDoUpdate({
      target: [responses.attemptId, responses.questionId],
      set: { questionStartedAt: startedAt, answeredAt: null },
    });
  return { ok: true };
}

/** 답안 저장(문항 단위 즉시 저장) */
export async function saveAnswer(
  examId: number,
  questionId: number,
  choice: number | null
) {
  if (!isValidId(examId) || !isValidId(questionId)) return { ok: false };
  const user = await requireUser();
  const attempt = await getMyAttempt(user.id, examId);
  if (!attempt || attempt.finishedAt) return { ok: false };

  const [q] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.examId, examId)));
  if (!q) return { ok: false };
  if (
    choice !== null &&
    (!Number.isInteger(choice) || choice < 1 || choice > q.choices.length)
  ) {
    return { ok: false };
  }
  if (!sectionActive(attempt.sectionState, q.subject)) return { ok: false };

  const isCorrect = choice != null && choice === q.answer;
  await db
    .insert(responses)
    .values({
      attemptId: attempt.id,
      questionId,
      choice,
      isCorrect,
      timeSpentSeconds: 0,
    })
    .onConflictDoUpdate({
      target: [responses.attemptId, responses.questionId],
      set: { choice, isCorrect },
    });
  return { ok: true };
}

/** 과목 섹션 종료(수동 제출 또는 시간 만료). 마지막 과목이면 응시 완료 처리 */
export async function finishSection(examId: number, subject: Subject) {
  if (!isValidId(examId) || !isSubject(subject)) {
    throw new Error("잘못된 응시 요청입니다.");
  }
  const user = await requireUser();
  const attempt = await getMyAttempt(user.id, examId);
  if (!attempt || attempt.finishedAt)
    return { sectionState: attempt?.sectionState ?? {}, finished: !!attempt?.finishedAt };

  const state: SectionState = { ...attempt.sectionState };
  const s = state[subject];
  if (!s) throw new Error("시작하지 않은 유형입니다.");
  if (s && !s.finishedAt) {
    state[subject] = { ...s, finishedAt: new Date().toISOString() };
  }

  await closeOpenQuestionTimers(attempt.id);

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

/** 미완료 응시 중단. 나가기를 확정하면 답안과 진행 상태를 모두 초기화한다. */
export async function abandonAttempt(examId: number) {
  const user = await requireUser();
  await deleteUnfinishedAttempts(user.id, examId);
  return { ok: true };
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
