"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questionNotes, questions, exams } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { ensureQuestionNotesSchema } from "@/db/ensure-question-notes";
import { NOTE_DRAWING_MAX, NOTE_DRAWING_PREFIX, NOTE_TEXT_MAX, type QuestionNote } from "@/lib/question-note";

export async function loadQuestionNote(questionId: number): Promise<QuestionNote | null> {
  const user = await requireUser();
  if (!Number.isInteger(questionId)) return null;
  await ensureQuestionNotesSchema();
  const [row] = await db
    .select({ text: questionNotes.text, drawing: questionNotes.drawing })
    .from(questionNotes)
    .innerJoin(questions, eq(questions.id, questionNotes.questionId))
    .innerJoin(exams, eq(exams.id, questions.examId))
    .where(and(eq(exams.published, true), eq(questionNotes.userId, user.id), eq(questionNotes.questionId, questionId)));
  return row ?? null;
}

export async function saveQuestionNote(input: { questionId: number; text: string; drawing: string | null }) {
  const user = await requireUser();
  await ensureQuestionNotesSchema();
  const text = typeof input.text === "string" ? input.text.slice(0, NOTE_TEXT_MAX) : "";
  const drawing = typeof input.drawing === "string" && input.drawing ? input.drawing : null;
  if (!Number.isInteger(input.questionId)) return { ok: false, error: "문항을 찾을 수 없습니다." };
  if (drawing && (!drawing.startsWith(NOTE_DRAWING_PREFIX) || drawing.length > NOTE_DRAWING_MAX)) {
    return { ok: false, error: "그림이 너무 커서 저장하지 못했습니다. 일부를 지우고 다시 시도해주세요." };
  }

  const [question] = await db.select({ id: questions.id }).from(questions)
    .innerJoin(exams, eq(exams.id, questions.examId))
    .where(and(eq(questions.id, input.questionId), eq(exams.published, true)));
  if (!question) return { ok: false, error: "문항을 찾을 수 없습니다." };

  const owner = and(eq(questionNotes.userId, user.id), eq(questionNotes.questionId, input.questionId));
  if (!text.trim() && !drawing) {
    await db.delete(questionNotes).where(owner);
    return { ok: true };
  }

  await db
    .insert(questionNotes)
    .values({ userId: user.id, questionId: input.questionId, text, drawing })
    .onConflictDoUpdate({
      target: [questionNotes.userId, questionNotes.questionId],
      set: { text, drawing, updatedAt: new Date() },
    });
  return { ok: true };
}
