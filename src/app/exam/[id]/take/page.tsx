import { notFound, redirect } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { attempts, exams, questions, responses, type Subject } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getExamSubjects, startAttempt } from "@/lib/actions/exam";
import ExamRunner, { type ClientQuestion } from "@/components/ExamRunner";

export const dynamic = "force-dynamic";

export default async function TakePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ restart?: string; resume?: string }>;
}) {
  const { id } = await params;
  const examId = Number(id);
  if (!Number.isInteger(examId) || examId <= 0) notFound();

  const user = await requireUser();
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
  if (!exam) notFound();

  const query = await searchParams;
  let resumeAttemptId = query.resume === undefined ? undefined : Number(query.resume);
  if (!exam.published) {
    const [unfinished] = await db.select({ id: attempts.id }).from(attempts)
      .where(and(eq(attempts.userId, user.id), eq(attempts.examId, examId), isNull(attempts.finishedAt)))
      .orderBy(desc(attempts.id)).limit(1);
    if (!unfinished) redirect("/");
    resumeAttemptId = unfinished.id;
  }
  if (query.restart !== "1" && resumeAttemptId === undefined) {
    const [unfinished] = await db.select({ id: attempts.id }).from(attempts)
      .where(and(eq(attempts.userId, user.id), eq(attempts.examId, examId), isNull(attempts.finishedAt)))
      .orderBy(desc(attempts.id)).limit(1);
    if (unfinished) {
      return (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 px-4">
          <section role="dialog" aria-modal="true" aria-labelledby="resume-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h1 id="resume-title" className="text-lg font-bold">응시 중인 데이터가 있습니다. 이어서 하시겠습니까?</h1>
            <form className="mt-6 flex justify-end gap-2" action={`/exam/${examId}/take`}>
              <button name="restart" value="1" className="rounded-lg border px-4 py-2 text-sm font-semibold">처음부터</button>
              <button name="resume" value={unfinished.id} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">이어서 하기</button>
            </form>
          </section>
        </div>
      );
    }
  }

  let attemptId: number;
  try {
    ({ attemptId } = await startAttempt(examId, exam.published && query.restart === "1" ? undefined : resumeAttemptId));
  } catch {
    redirect(`/exam/${examId}/take`);
  }
  const [attempt] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.userId, user.id), eq(attempts.examId, examId), eq(attempts.id, attemptId)))
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
      attemptId={attempt.id}
      examTitle={exam.title}
      subjects={subjects as Subject[]}
      questionsBySubject={questionsBySubject}
      attemptStartedAt={attempt.startedAt.toISOString()}
      initialSectionState={attempt.sectionState}
      initialAnswers={initialAnswers}
    />
  );
}
