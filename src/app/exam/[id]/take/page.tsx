import { notFound, redirect } from "next/navigation";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { attempts, exams, questions, responses, type Subject } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getExamSubjects, startAttempt } from "@/lib/actions/exam";
import ExamRunner, { type ClientQuestion } from "@/components/ExamRunner";

export const dynamic = "force-dynamic";

export default async function TakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const examId = Number(id);
  if (!Number.isInteger(examId)) notFound();

  const user = await requireUser();
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
  if (!exam || !exam.published) notFound();

  const [finishedAttempt] = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, user.id),
        eq(attempts.examId, examId),
        isNotNull(attempts.finishedAt)
      )
    )
    .orderBy(desc(attempts.id))
    .limit(1);
  if (finishedAttempt) redirect(`/exam/${examId}/result`);

  try {
    await startAttempt(examId);
  } catch {
    redirect("/");
  }
  const [attempt] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.userId, user.id), eq(attempts.examId, examId)))
    .orderBy(desc(attempts.id))
    .limit(1);
  if (!attempt) redirect("/");
  if (attempt.finishedAt) redirect(`/exam/${examId}/result`);

  const qs = await db
    .select({
      id: questions.id,
      subject: questions.subject,
      number: questions.number,
      body: questions.body,
      imageUrl: questions.imageUrl,
      choices: questions.choices,
    })
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(asc(questions.subject), asc(questions.number));

  const subjects = await getExamSubjects(examId);

  const questionsBySubject: Record<string, ClientQuestion[]> = {};
  for (const s of subjects) questionsBySubject[s] = [];
  for (const q of qs) questionsBySubject[q.subject].push(q);

  const existing = await db
    .select({ questionId: responses.questionId, choice: responses.choice })
    .from(responses)
    .where(eq(responses.attemptId, attempt.id));
  const initialAnswers: Record<number, number | null> = {};
  for (const r of existing) initialAnswers[r.questionId] = r.choice;

  return (
    <ExamRunner
      examId={examId}
      examTitle={exam.title}
      subjects={subjects as Subject[]}
      questionsBySubject={questionsBySubject}
      initialSectionState={attempt.sectionState}
      initialAnswers={initialAnswers}
    />
  );
}
