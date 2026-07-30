import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attempts,
  exams,
  questions,
  responses,
  SECTION_MINUTES,
  users,
  SUBJECTS,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import SubjectRadar from "@/components/SubjectRadar";
import ScoreDistributionChart from "@/components/ScoreDistributionChart";
import ExamStartButton from "@/components/ExamStartButton";
import ResultReview, { type ReviewQuestion } from "@/components/ResultReview";
import ResultStrategyAnalysis, {
  type StrategyAnalysisInput,
} from "@/components/ResultStrategyAnalysis";

export const dynamic = "force-dynamic";

function maskName(value: string | null) {
  if (!value) return "-";
  return value[0] + "*".repeat(Math.max(1, value.length - 1));
}

function distributionBands(totalQuestions: number) {
  const step = Math.max(1, Math.ceil(totalQuestions / 10));
  return Array.from({ length: 10 }, (_, index) => {
    const min = index * step;
    const max =
      index === 9 ? totalQuestions : Math.min(totalQuestions, (index + 1) * step - 1);
    return { min, max, label: `${min}-${max}` };
  });
}

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ round?: string }>;
}) {
  const { id } = await params;
  const { round } = await searchParams;
  const examId = Number(id);
  if (!Number.isInteger(examId)) notFound();

  const user = await requireUser();
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
  if (!exam) notFound();

  const myAttempts = await db
    .select()
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, user.id),
        eq(attempts.examId, examId),
        isNotNull(attempts.finishedAt)
      )
    )
    .orderBy(asc(attempts.id));
  const requestedRound = Number(round ?? "");
  const selectedRound =
    Number.isInteger(requestedRound) &&
    requestedRound >= 1 &&
    requestedRound <= myAttempts.length
      ? requestedRound
      : myAttempts.length;
  const myAttempt = myAttempts[selectedRound - 1];
  if (!myAttempt) redirect(`/exam/${examId}/take`);

  const qs = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(asc(questions.subject), asc(questions.number));

  const examSubjects = SUBJECTS.filter((s) => qs.some((q) => q.subject === s));
  const totalBySubject = new Map<string, number>();
  for (const q of qs) {
    totalBySubject.set(q.subject, (totalBySubject.get(q.subject) ?? 0) + 1);
  }
  const subjectInfo = examSubjects.map((subject) => ({
    subject,
    total: totalBySubject.get(subject) ?? 0,
  }));

  // 완료된 응시 — 유저별 N번째 완료 기록끼리 비교한다.
  const finishedRows = await db
    .select({
      attemptId: attempts.id,
      userId: attempts.userId,
      nickname: users.nickname,
      name: users.name,
      campus: users.campus,
      classNumber: users.classNumber,
    })
    .from(attempts)
    .innerJoin(users, eq(users.id, attempts.userId))
    .where(and(eq(attempts.examId, examId), isNotNull(attempts.finishedAt)))
    .orderBy(asc(attempts.id));
  const attemptRowsByUser = new Map<number, (typeof finishedRows)>();
  for (const row of finishedRows) {
    const rows = attemptRowsByUser.get(row.userId) ?? [];
    rows.push(row);
    attemptRowsByUser.set(row.userId, rows);
  }
  const finishedAttempts = [...attemptRowsByUser.values()]
    .map((rows) => rows[selectedRound - 1])
    .filter((row): row is (typeof finishedRows)[number] => Boolean(row));
  const campusAttempts = finishedAttempts.filter(
    (a) => a.campus === user.campus
  );
  const classAttempts = finishedAttempts.filter(
    (a) => a.campus === user.campus && a.classNumber === user.classNumber
  );
  const n = finishedAttempts.length;
  const attemptIds = finishedAttempts.map((a) => a.attemptId);
  const peerAttemptIds = finishedAttempts
    .filter((a) => a.userId !== user.id)
    .map((a) => a.attemptId);
  const peerCount = peerAttemptIds.length;
  const analysisAttemptIds = peerAttemptIds.length ? peerAttemptIds : [myAttempt.id];
  const analysisCount = analysisAttemptIds.length;

  // 응시별 · 과목별 정답 수
  const subjectCorrect = await db
    .select({
      attemptId: responses.attemptId,
      subject: questions.subject,
      correct: sql<number>`count(*) filter (where ${responses.isCorrect})::int`,
    })
    .from(responses)
    .innerJoin(questions, eq(questions.id, responses.questionId))
    .where(inArray(responses.attemptId, attemptIds))
    .groupBy(responses.attemptId, questions.subject);

  const scoreByAttempt = new Map<number, { total: number; bySubject: Map<string, number> }>();
  for (const a of finishedAttempts)
    scoreByAttempt.set(a.attemptId, { total: 0, bySubject: new Map() });
  for (const row of subjectCorrect) {
    const s = scoreByAttempt.get(row.attemptId)!;
    s.total += row.correct;
    s.bySubject.set(row.subject, row.correct);
  }

  const myScore = scoreByAttempt.get(myAttempt.id)!;
  const totalQuestions = qs.length;
  const rank =
    1 +
    finishedAttempts.filter(
      (a) => scoreByAttempt.get(a.attemptId)!.total > myScore.total
    ).length;
  const averageTotal =
    n > 0
      ? finishedAttempts.reduce(
          (acc, a) => acc + scoreByAttempt.get(a.attemptId)!.total,
          0
        ) / n
      : 0;
  const averageOf = (items: typeof finishedAttempts) =>
    items.length
      ? items.reduce(
          (acc, a) => acc + scoreByAttempt.get(a.attemptId)!.total,
          0
        ) / items.length
      : 0;
  const campusAverageTotal = averageOf(campusAttempts);
  const classAverageTotal = averageOf(classAttempts);
  const scoreDistribution = distributionBands(totalQuestions).map((band) => {
    const count = finishedAttempts.filter((a) => {
      const score = scoreByAttempt.get(a.attemptId)!.total;
      return score >= band.min && score <= band.max;
    }).length;
    const includesMe = myScore.total >= band.min && myScore.total <= band.max;
    return {
      ...band,
      count,
      includesMe,
      percent: n ? Math.round((count / n) * 100) : 0,
    };
  });
  // 문항별 전체 정답률 (무응답/미기록은 오답 처리: 분모 = 완료 인원)
  const qAccuracyRows = await db
    .select({
      questionId: responses.questionId,
      correct: sql<number>`count(*) filter (where ${responses.isCorrect})::int`,
    })
    .from(responses)
    .where(inArray(responses.attemptId, attemptIds))
    .groupBy(responses.questionId);
  const correctCountByQ = new Map(
    qAccuracyRows.map((r) => [r.questionId, r.correct])
  );

  const analysisAccuracyRows = analysisAttemptIds.length
    ? await db
        .select({
          questionId: responses.questionId,
          correct: sql<number>`count(*) filter (where ${responses.isCorrect})::int`,
        })
        .from(responses)
        .where(inArray(responses.attemptId, analysisAttemptIds))
        .groupBy(responses.questionId)
    : [];
  const analysisCorrectCountByQ = new Map(
    analysisAccuracyRows.map((r) => [r.questionId, r.correct])
  );

  const analysisChoiceRows = analysisAttemptIds.length
    ? await db
        .select({
          questionId: responses.questionId,
          choice: responses.choice,
          count: sql<number>`count(*)::int`,
        })
        .from(responses)
        .where(and(inArray(responses.attemptId, analysisAttemptIds), isNotNull(responses.choice)))
        .groupBy(responses.questionId, responses.choice)
    : [];
  const analysisChoiceCountsByQ = new Map<number, number[]>();
  for (const row of analysisChoiceRows) {
    if (row.choice == null) continue;
    const counts = analysisChoiceCountsByQ.get(row.questionId) ?? [0, 0, 0, 0, 0];
    counts[row.choice - 1] = row.count;
    analysisChoiceCountsByQ.set(row.questionId, counts);
  }

  // 내 응답
  const myResponses = await db
    .select()
    .from(responses)
    .where(eq(responses.attemptId, myAttempt.id));
  const myResponseByQ = new Map(myResponses.map((r) => [r.questionId, r]));
  const myChoiceByQ = new Map(myResponses.map((r) => [r.questionId, r.choice]));

  // 레이더 데이터: 과목별 정답률(%) 나 vs 전체 평균
  const radarData = examSubjects.map((s) => {
    const total = totalBySubject.get(s) ?? 0;
    const mine = myScore.bySubject.get(s) ?? 0;
    const groupSum = finishedAttempts.reduce(
      (acc, a) => acc + (scoreByAttempt.get(a.attemptId)!.bySubject.get(s) ?? 0),
      0
    );
    const campusSum = campusAttempts.reduce(
      (acc, a) => acc + (scoreByAttempt.get(a.attemptId)!.bySubject.get(s) ?? 0),
      0
    );
    const classSum = classAttempts.reduce(
      (acc, a) => acc + (scoreByAttempt.get(a.attemptId)!.bySubject.get(s) ?? 0),
      0
    );
    return {
      subject: s,
      나: total ? Math.round((mine / total) * 100) : 0,
      그룹평균: total && n ? Math.round((groupSum / n / total) * 100) : 0,
      캠퍼스평균:
        total && campusAttempts.length
          ? Math.round((campusSum / campusAttempts.length / total) * 100)
          : 0,
      분반평균:
        total && classAttempts.length
          ? Math.round((classSum / classAttempts.length / total) * 100)
          : 0,
      avgScore: n ? groupSum / n : 0, // 전체 평균 정답 수 (문항)
      campusAvgScore: campusAttempts.length
        ? campusSum / campusAttempts.length
        : 0,
      classAvgScore: classAttempts.length ? classSum / classAttempts.length : 0,
    };
  });

  // 랭킹 테이블
  const ranking = [...finishedAttempts]
    .map((a) => ({
      name: a.name,
      nickname: a.nickname,
      isMe: a.userId === user.id,
      total: scoreByAttempt.get(a.attemptId)!.total,
    }))
    .sort((a, b) => b.total - a.total);

  const reviewQuestions: ReviewQuestion[] = qs.map((q) => {
    const myChoice = myChoiceByQ.get(q.id) ?? null;
    const response = myResponseByQ.get(q.id);
    const elapsedSeconds = response
      ? response.timeSpentSeconds +
        (response.questionStartedAt && response.answeredAt
          ? Math.max(
              0,
              Math.round(
                (response.answeredAt.getTime() - response.questionStartedAt.getTime()) /
                  1000
              )
            )
          : 0)
      : 0;
    const groupAccuracy = n
      ? Math.round(((correctCountByQ.get(q.id) ?? 0) / n) * 100)
      : 0;
    const peerWrongRate = analysisCount
      ? 100 -
        Math.round(((analysisCorrectCountByQ.get(q.id) ?? 0) / analysisCount) * 100)
      : null;
    const analysisChoiceCounts = analysisChoiceCountsByQ.get(q.id) ?? [0, 0, 0, 0, 0];
    return {
      id: q.id,
      subject: q.subject,
      number: q.number,
      body: q.body,
      imageUrl: q.imageUrl,
      choices: q.choices,
      answer: q.answer,
      explanation: q.explanation,
      myChoice,
      elapsedSeconds,
      isCorrect: myChoice === q.answer,
      groupAccuracy,
      peerWrongRate,
      choiceRates:
        analysisCount
          ? analysisChoiceCounts.map((count) => Math.round((count / analysisCount) * 100))
          : null,
    };
  });

  const reviewSubjects = examSubjects.map((subject) => {
    const subjectQuestions = reviewQuestions.filter((q) => q.subject === subject);
    return {
      subject,
      mine: myScore.bySubject.get(subject) ?? 0,
      total: totalBySubject.get(subject) ?? 0,
      elapsedSeconds: subjectQuestions.reduce(
        (sum, question) => sum + (question.elapsedSeconds ?? 0),
        0
      ),
      hardQuestions:
        [...subjectQuestions]
          .filter((q) => q.peerWrongRate != null)
          .sort((a, b) => (b.peerWrongRate ?? 0) - (a.peerWrongRate ?? 0)),
    };
  });

  const strategyInput: StrategyAnalysisInput = {
    examTitle: exam.title,
    score: myScore.total,
    total: totalQuestions,
    rank,
    participants: n,
    unanswered: reviewQuestions.filter((q) => q.myChoice == null).length,
    easyMistakes: reviewQuestions.filter(
      (q) => !q.isCorrect && q.myChoice != null && q.groupAccuracy >= 70
    ).length,
    subjects: radarData.map((subject) => ({
      subject: subject.subject,
      score: myScore.bySubject.get(subject.subject) ?? 0,
      total: totalBySubject.get(subject.subject) ?? 0,
      accuracy: subject.나,
      averageAccuracy: subject.그룹평균,
      elapsedSeconds:
        reviewQuestions
          .filter((q) => q.subject === subject.subject)
          .reduce((sum, q) => sum + (q.elapsedSeconds ?? 0), 0),
    })),
    questions: reviewQuestions.map((q) => ({
      subject: q.subject,
      number: q.number,
      status: q.myChoice == null ? "미응답" : q.isCorrect ? "정답" : "오답",
      isEasyMistake: !q.isCorrect && q.myChoice != null && q.groupAccuracy >= 70,
      elapsedSeconds: q.elapsedSeconds ?? 0,
      peerWrongRate: q.peerWrongRate,
      difficulty:
        q.peerWrongRate == null
          ? "분석 불가"
          : q.peerWrongRate >= 50
            ? "고오답률"
            : "저오답률",
    })),
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/"
          className="mb-2 inline-block text-sm text-zinc-500 hover:underline"
        >
          ← 목록으로
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">
            {exam.title} — {selectedRound}회차 결과
          </h1>
          <ExamStartButton
            examId={examId}
            title={exam.title}
            label="재응시"
            subjects={subjectInfo}
            sectionMinutes={SECTION_MINUTES}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {myAttempts.map((attempt, index) => {
            const attemptRound = index + 1;
            const active = attemptRound === selectedRound;
            return (
              <Link
                key={attempt.id}
                href={`/exam/${examId}/result?round=${attemptRound}`}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-hairline bg-white text-ink-2 hover:bg-page"
                }`}
              >
                {attemptRound}회차
              </Link>
            );
          })}
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="metric-card p-5 text-center">
          <p className="text-xs text-zinc-400">총점</p>
          <p className="mt-1 text-3xl font-extrabold text-brand">
            {myScore.total}
            <span className="text-base font-medium text-zinc-400">
              /{totalQuestions}
            </span>
          </p>
        </div>
        <div className="metric-card p-5 text-center">
          <p className="text-xs text-zinc-400">전체 평균 점수</p>
          <p className="mt-1 text-3xl font-extrabold text-zinc-900">
            {averageTotal.toFixed(1)}
            <span className="text-base font-medium text-zinc-400">
              /{totalQuestions}
            </span>
          </p>
        </div>
        <div className="metric-card p-5 text-center">
          <p className="text-xs text-zinc-400">내 캠퍼스 평균</p>
          <p className="mt-1 text-3xl font-extrabold text-zinc-900">
            {campusAverageTotal.toFixed(1)}
            <span className="text-base font-medium text-zinc-400">
              /{totalQuestions}
            </span>
          </p>
        </div>
        <div className="metric-card p-5 text-center">
          <p className="text-xs text-zinc-400">내 분반 평균</p>
          <p className="mt-1 text-3xl font-extrabold text-zinc-900">
            {classAverageTotal.toFixed(1)}
            <span className="text-base font-medium text-zinc-400">
              /{totalQuestions}
            </span>
          </p>
        </div>
        <div className="metric-card p-5 text-center">
          <p className="text-xs text-zinc-400">등수</p>
          <p className="mt-1 text-3xl font-extrabold text-brand">
            {rank}
            <span className="text-base font-medium text-zinc-400">/{n}등</span>
          </p>
        </div>
        <div className="metric-card p-5 text-center">
          <p className="text-xs text-zinc-400">응시 인원</p>
          <p className="mt-1 text-3xl font-extrabold text-zinc-900">
            {n}
            <span className="text-base font-medium text-zinc-400">명</span>
          </p>
        </div>
      </div>

      <ResultStrategyAnalysis input={strategyInput} />

      <div className="chart-card mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-semibold">전체 시험자 점수 분포</h2>
            <p className="mt-1 text-xs text-zinc-400">
              완료 응시 {n}명 기준
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            평균 {averageTotal.toFixed(1)}점 · 최고 {ranking[0]?.total ?? 0}점
          </div>
        </div>
        <div className="overflow-x-auto">
          <ScoreDistributionChart
            data={scoreDistribution}
            myScore={myScore.total}
            average={averageTotal}
          />
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {/* 과목별 레이더 */}
        <div className="chart-card flex flex-col p-5">
          <h2 className="mb-2 font-semibold">과목별 점수 비교</h2>
          <SubjectRadar data={radarData} className="min-h-80 flex-1" />
        </div>

        {/* 과목별 표 + 랭킹 */}
        <div className="flex flex-col gap-4">
          <div className="chart-card p-5">
            <h2 className="mb-3 font-semibold">과목별 점수</h2>
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium first:rounded-l-xl">과목</th>
                  <th className="px-3 py-2 text-right font-medium">내 점수</th>
                  <th className="px-3 py-2 text-right font-medium">전체 평균</th>
                  <th className="px-3 py-2 text-right font-medium">캠퍼스 평균</th>
                  <th className="px-3 py-2 text-right font-medium">분반 평균</th>
                  <th className="px-3 py-2 text-right font-medium last:rounded-r-xl">차이</th>
                </tr>
              </thead>
              <tbody>
                {radarData.map((r) => {
                  const diff = r.나 - r.그룹평균;
                  return (
                    <tr key={r.subject}>
                      <td className="px-3 py-2.5 text-zinc-600">{r.subject}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">
                        {myScore.bySubject.get(r.subject) ?? 0}/
                        {totalBySubject.get(r.subject)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-zinc-500">
                        평균 {r.avgScore.toFixed(1)}/
                        {totalBySubject.get(r.subject)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-zinc-500">
                        {r.campusAvgScore.toFixed(1)}/
                        {totalBySubject.get(r.subject)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-zinc-500">
                        {r.classAvgScore.toFixed(1)}/
                        {totalBySubject.get(r.subject)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right text-xs font-medium ${
                          diff > 0
                            ? "text-[#b98328]"
                            : diff < 0
                              ? "text-brand"
                              : "text-zinc-400"
                        }`}
                      >
                        {diff > 0 ? "+" : ""}
                        {diff}점
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="chart-card p-5">
            <h2 className="mb-3 font-semibold">랭킹</h2>
            <ol className="space-y-1.5 text-sm">
              {ranking.slice(0, 5).map((r, i) => (
                <li
                  key={i}
                  className="flex justify-between rounded-xl bg-page px-3 py-2 text-zinc-600"
                >
                  <span>
                    {i + 1}위 · {maskName(r.name)} · {maskName(r.nickname)}
                  </span>
                  <span>
                    {r.total}/{totalQuestions}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex justify-between rounded-xl border border-[#f4d4ce] bg-[#fff7f5] px-3 py-2 text-sm font-semibold text-brand">
              <span>내 등수 · {rank}위</span>
              <span>
                {myScore.total}/{totalQuestions}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ResultReview
        examId={examId}
        questions={reviewQuestions}
        subjects={reviewSubjects}
        peerCount={peerCount}
      />
    </div>
  );
}
