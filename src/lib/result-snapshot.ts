import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attempts,
  attemptResults,
  questions,
  responses,
  SUBJECTS,
  type AttemptResultSnapshot,
  type Subject,
} from "@/db/schema";

export async function createAttemptResultSnapshot(attemptId: number) {
  const [attempt] = await db
    .select({ examId: attempts.examId })
    .from(attempts)
    .where(eq(attempts.id, attemptId));
  if (!attempt) throw new Error("응시 기록을 찾을 수 없습니다.");

  const rows = await db
    .select({
      questionId: questions.id,
      subject: questions.subject,
      answer: questions.answer,
      choice: responses.choice,
      isCorrect: responses.isCorrect,
      timeSpentSeconds: responses.timeSpentSeconds,
      questionStartedAt: responses.questionStartedAt,
      answeredAt: responses.answeredAt,
    })
    .from(questions)
    .leftJoin(
      responses,
      and(
        eq(responses.questionId, questions.id),
        eq(responses.attemptId, attemptId)
      )
    )
    .where(eq(questions.examId, attempt.examId))
    .orderBy(asc(questions.subject), asc(questions.number));

  const subjectScores = Object.fromEntries(
    SUBJECTS.map((subject) => [subject, 0])
  ) as Record<Subject, number>;
  const subjectTotals = Object.fromEntries(
    SUBJECTS.map((subject) => [subject, 0])
  ) as Record<Subject, number>;
  const subjectElapsedSeconds = Object.fromEntries(
    SUBJECTS.map((subject) => [subject, 0])
  ) as Record<Subject, number>;

  const snapshotQuestions = rows.map((row) => {
    const elapsedSeconds =
      (row.timeSpentSeconds ?? 0) +
      (row.questionStartedAt && row.answeredAt
        ? Math.max(
            0,
            Math.round(
              (row.answeredAt.getTime() - row.questionStartedAt.getTime()) /
                1000
            )
          )
        : 0);
    subjectTotals[row.subject] += 1;
    subjectElapsedSeconds[row.subject] += elapsedSeconds;
    if (row.isCorrect) subjectScores[row.subject] += 1;
    return {
      questionId: row.questionId,
      choice: row.choice,
      isCorrect: row.isCorrect ?? false,
      elapsedSeconds,
    };
  });

  const totalScore = Object.values(subjectScores).reduce(
    (sum, score) => sum + score,
    0
  );
  const totalQuestions = snapshotQuestions.length;
  const unanswered = snapshotQuestions.filter((question) => question.choice == null).length;
  const easyMistakes = snapshotQuestions.filter(
    (question) => !question.isCorrect && question.choice != null
  ).length;

  const snapshot: AttemptResultSnapshot = {
    totalScore,
    totalQuestions,
    subjectScores,
    subjectTotals,
    subjectElapsedSeconds,
    unanswered,
    easyMistakes,
    questions: snapshotQuestions,
  };

  const [result] = await db
    .insert(attemptResults)
    .values({
      attemptId,
      totalScore,
      totalQuestions,
      snapshot,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: attemptResults.attemptId,
      set: {
        totalScore,
        totalQuestions,
        snapshot,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}
