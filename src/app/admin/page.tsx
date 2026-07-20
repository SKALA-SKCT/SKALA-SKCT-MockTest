import Link from "next/link";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attempts,
  exams,
  questions,
  responses,
  SUBJECTS,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import AdminCharts from "@/components/AdminCharts";

export const dynamic = "force-dynamic";

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function avg(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function formatMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${Math.round(value)}분`;
}

function compactSubject(subject: string) {
  const names: Record<string, string> = {
    언어이해: "언어",
    자료해석: "자료",
    창의수리: "창의",
    언어추리: "추리",
    수열추리: "수열",
  };
  return names[subject] ?? subject;
}

export default async function AdminPage() {
  await requireAdmin();

  const [examList, userRows, attemptRows, questionTotals] = await Promise.all([
    db.select().from(exams).orderBy(asc(exams.createdAt)),
    db
      .select({
        id: users.id,
        campus: users.campus,
        classNumber: users.classNumber,
      })
      .from(users),
    db
      .select({
        id: attempts.id,
        userId: attempts.userId,
        examId: attempts.examId,
        startedAt: attempts.startedAt,
        finishedAt: attempts.finishedAt,
        campus: users.campus,
        classNumber: users.classNumber,
      })
      .from(attempts)
      .innerJoin(users, eq(users.id, attempts.userId)),
    db
      .select({
        examId: questions.examId,
        subject: questions.subject,
        total: sql<number>`count(*)::int`,
      })
      .from(questions)
      .groupBy(questions.examId, questions.subject),
  ]);

  const finishedAttemptIds = attemptRows
    .filter((attempt) => attempt.finishedAt)
    .map((attempt) => attempt.id);

  const subjectCorrect = finishedAttemptIds.length
    ? await db
        .select({
          attemptId: responses.attemptId,
          subject: questions.subject,
          correct: sql<number>`count(*) filter (where ${responses.isCorrect})::int`,
        })
        .from(responses)
        .innerJoin(questions, eq(questions.id, responses.questionId))
        .where(inArray(responses.attemptId, finishedAttemptIds))
        .groupBy(responses.attemptId, questions.subject)
    : [];

  const correctOf = new Map<string, number>();
  const scoreByAttempt = new Map<number, number>();
  for (const row of subjectCorrect) {
    correctOf.set(`${row.attemptId}:${row.subject}`, row.correct);
    scoreByAttempt.set(
      row.attemptId,
      (scoreByAttempt.get(row.attemptId) ?? 0) + row.correct
    );
  }

  const totalByExamSubject = new Map<string, number>();
  const totalByExam = new Map<number, number>();
  for (const row of questionTotals) {
    totalByExamSubject.set(`${row.examId}:${row.subject}`, row.total);
    totalByExam.set(row.examId, (totalByExam.get(row.examId) ?? 0) + row.total);
  }

  const completedAttempts = attemptRows.filter((attempt) => attempt.finishedAt);
  const abandonedAttempts = attemptRows.filter((attempt) => !attempt.finishedAt);
  const completedUserCount = new Set(completedAttempts.map((attempt) => attempt.userId))
    .size;
  const overallScores = completedAttempts.map(
    (attempt) => scoreByAttempt.get(attempt.id) ?? 0
  );
  const overallTotalQuestions = examList.length
    ? avg(examList.map((exam) => totalByExam.get(exam.id) ?? 0))
    : 0;

  const campusCounts = userRows.reduce<Record<string, number>>((acc, user) => {
    acc[user.campus] = (acc[user.campus] ?? 0) + 1;
    return acc;
  }, {});

  const examStats = examList.map((exam, index) => {
    const examAttempts = attemptRows.filter((attempt) => attempt.examId === exam.id);
    const examFinished = examAttempts.filter((attempt) => attempt.finishedAt);
    const totalQuestions = totalByExam.get(exam.id) ?? 0;
    const scores = examFinished.map((attempt) => scoreByAttempt.get(attempt.id) ?? 0);
    const durations = examFinished
      .map((attempt) =>
        attempt.finishedAt
          ? (attempt.finishedAt.getTime() - attempt.startedAt.getTime()) / 60000
          : 0
      )
      .filter((duration) => duration > 0);

    const subjectRates = SUBJECTS.map((subject) => {
      const subjectTotal = totalByExamSubject.get(`${exam.id}:${subject}`) ?? 0;
      const correct = examFinished.reduce(
        (sum, attempt) => sum + (correctOf.get(`${attempt.id}:${subject}`) ?? 0),
        0
      );
      const denominator = subjectTotal * examFinished.length;
      return {
        subject,
        rate: denominator ? (correct / denominator) * 100 : 0,
      };
    }).filter((item) => (totalByExamSubject.get(`${exam.id}:${item.subject}`) ?? 0) > 0);

    const campusFinished = examFinished.reduce<Record<string, number>>(
      (acc, attempt) => {
        acc[attempt.campus] = (acc[attempt.campus] ?? 0) + 1;
        return acc;
      },
      {}
    );
    const classFinished = examFinished.reduce<Record<string, number>>(
      (acc, attempt) => {
        const key = `${attempt.campus} ${attempt.classNumber}반`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {}
    );

    return {
      no: index + 1,
      exam,
      totalQuestions,
      started: examAttempts.length,
      completed: examFinished.length,
      abandoned: examAttempts.length - examFinished.length,
      uniqueStarters: new Set(examAttempts.map((attempt) => attempt.userId)).size,
      uniqueFinishers: new Set(examFinished.map((attempt) => attempt.userId)).size,
      completionRate: examAttempts.length
        ? (examFinished.length / examAttempts.length) * 100
        : 0,
      averageScore: avg(scores),
      bestScore: scores.length ? Math.max(...scores) : 0,
      lowestScore: scores.length ? Math.min(...scores) : 0,
      averageAccuracy: totalQuestions ? (avg(scores) / totalQuestions) * 100 : 0,
      averageDuration: avg(durations),
      subjectRates,
      campusFinished,
      classFinished,
    };
  });

  const scorePercent = (score: number, total: number) =>
    total ? Math.round((score / total) * 100) : 0;
  const examChartData = examStats.map((row) => ({
    name: `${row.no}회`,
    시작: row.started,
    완료: row.completed,
    중도이탈: row.abandoned,
    평균: scorePercent(row.averageScore, row.totalQuestions),
    최고: scorePercent(row.bestScore, row.totalQuestions),
    최저: scorePercent(row.lowestScore, row.totalQuestions),
  }));

  const subjectChartData = SUBJECTS.map((subject) => {
    const totals = completedAttempts.reduce(
      (acc, attempt) => {
        const total = totalByExamSubject.get(`${attempt.examId}:${subject}`) ?? 0;
        return {
          correct: acc.correct + (correctOf.get(`${attempt.id}:${subject}`) ?? 0),
          total: acc.total + total,
        };
      },
      { correct: 0, total: 0 }
    );
    return {
      subject,
      평균정답률: totals.total ? Math.round((totals.correct / totals.total) * 100) : 0,
    };
  });

  const groupScores = completedAttempts.reduce<
    Record<string, { completed: number; scoreSum: number }>
  >((acc, attempt) => {
    const campusKey = `campus:${attempt.campus}`;
    const classKey = `class:${attempt.campus} ${attempt.classNumber}반`;
    const score = scoreByAttempt.get(attempt.id) ?? 0;
    for (const key of [campusKey, classKey]) {
      const item = acc[key] ?? { completed: 0, scoreSum: 0 };
      item.completed += 1;
      item.scoreSum += score;
      acc[key] = item;
    }
    return acc;
  }, {});
  const campusChartData = ["판교", "울산", "광주"].map((campus) => {
    const item = groupScores[`campus:${campus}`] ?? { completed: 0, scoreSum: 0 };
    return {
      name: campus,
      완료: item.completed,
      평균점수: item.completed ? Math.round(item.scoreSum / item.completed) : 0,
    };
  });
  const classChartData = Object.entries(groupScores)
    .filter(([key]) => key.startsWith("class:"))
    .map(([key, item]) => ({
      name: key.replace(/^class:/, ""),
      완료: item.completed,
      평균점수: item.completed ? Math.round(item.scoreSum / item.completed) : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const overallTiles = [
    { label: "가입자", value: `${userRows.length}명`, sub: "전체 계정" },
    { label: "응시 시작", value: `${attemptRows.length}건`, sub: "전체 attempt" },
    { label: "응시 완료", value: `${completedAttempts.length}건`, sub: `${completedUserCount}명 완료` },
    { label: "중도이탈", value: `${abandonedAttempts.length}건`, sub: "미완료 attempt" },
    {
      label: "평균 점수",
      value: overallScores.length ? avg(overallScores).toFixed(1) : "-",
      sub: overallScores.length ? `/${Math.round(overallTotalQuestions)}문항` : "완료 기록 없음",
    },
    {
      label: "완료율",
      value: attemptRows.length
        ? pct((completedAttempts.length / attemptRows.length) * 100)
        : "-",
      sub: "완료/시작",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">
            관리자 통계
          </h1>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-page"
        >
          대시보드로
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        {overallTiles.map((tile) => (
          <div key={tile.label} className="metric-card px-5 py-4">
            <p className="text-xs font-medium text-ink-3">{tile.label}</p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
              {tile.value}
            </p>
            <p className="mt-1 text-xs text-ink-3">{tile.sub}</p>
          </div>
        ))}
      </section>

      <section className="chart-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">캠퍼스별 가입자</h2>
            <p className="mt-1 text-xs text-ink-3">회원 정보 기준</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["판교", "울산", "광주"].map((campus) => (
            <div
              key={campus}
              className="soft-panel px-4 py-3"
            >
              <p className="text-xs text-ink-3">{campus}</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {campusCounts[campus] ?? 0}명
              </p>
            </div>
          ))}
        </div>
      </section>

      <AdminCharts
        examData={examChartData}
        subjectData={subjectChartData}
        campusData={campusChartData}
        classData={classChartData}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="chart-card overflow-hidden">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">캠퍼스별 표</h2>
            <p className="mt-1 text-xs text-ink-3">완료 응시 기준</p>
          </div>
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th className="whitespace-nowrap px-5 py-3 text-left font-semibold first:rounded-tl-2xl">
                  캠퍼스
                </th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                  완료
                </th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-semibold last:rounded-tr-2xl">
                  평균점수
                </th>
              </tr>
            </thead>
            <tbody>
              {campusChartData.map((row) => (
                <tr key={row.name}>
                  <td className="whitespace-nowrap px-5 py-3 font-semibold text-ink">
                    {row.name}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                    {row.완료}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                    {row.평균점수}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-card overflow-hidden">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">분반별 표</h2>
            <p className="mt-1 text-xs text-ink-3">완료 응시가 있는 분반 기준</p>
          </div>
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th className="whitespace-nowrap px-5 py-3 text-left font-semibold first:rounded-tl-2xl">
                  분반
                </th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                  완료
                </th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-semibold last:rounded-tr-2xl">
                  평균점수
                </th>
              </tr>
            </thead>
            <tbody>
              {classChartData.length ? (
                classChartData.map((row) => (
                  <tr key={row.name}>
                    <td className="whitespace-nowrap px-5 py-3 font-semibold text-ink">
                      {row.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {row.완료}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                      {row.평균점수}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-8 text-center text-sm text-ink-3"
                  >
                    완료 응시가 있는 분반이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="chart-card overflow-hidden">
        <div className="border-b border-hairline px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">회차별 통계</h2>
          <p className="mt-1 text-xs text-ink-3">
            시작/완료/중도이탈은 응시 기록 기준, 점수는 완료 응시 기준입니다.
          </p>
        </div>
        <div className="overflow-hidden">
          <table className="data-table table-fixed text-left text-[13px]">
            <thead>
              <tr>
                <th className="w-12 whitespace-nowrap px-4 py-2.5 font-semibold first:rounded-tl-2xl">회차</th>
                <th className="w-[42%] whitespace-nowrap px-4 py-2.5 font-semibold">시험</th>
                <th className="w-[16%] whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                  시작/완료
                </th>
                <th className="w-[10%] whitespace-nowrap px-4 py-2.5 text-right font-semibold">완료율</th>
                <th className="w-[22%] whitespace-nowrap px-4 py-2.5 text-right font-semibold">점수</th>
                <th className="w-[10%] whitespace-nowrap px-4 py-2.5 text-right font-semibold last:rounded-tr-2xl">시간</th>
              </tr>
            </thead>
            <tbody>
              {examStats.map((row) => (
                <tr key={row.exam.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 font-bold text-ink">{row.no}</td>
                  <td className="px-4 py-2.5">
                    <p className="truncate font-semibold text-ink" title={row.exam.title}>
                      {row.exam.title}
                    </p>
                    <p
                      className="mt-1 truncate text-[11px] leading-4 text-ink-3"
                      title={row.subjectRates
                        .map((item) => `${item.subject} ${pct(item.rate)}`)
                        .join(" · ")}
                    >
                      유형{" "}
                      {row.subjectRates
                        .map((item) => `${compactSubject(item.subject)} ${pct(item.rate)}`)
                        .join(" · ")}
                    </p>
                    <p className="truncate text-[11px] leading-4 text-ink-3">
                      <span className="text-brand">
                        캠퍼스{" "}
                        {Object.entries(row.campusFinished).length
                          ? Object.entries(row.campusFinished)
                              .map(([campus, count]) => `${campus} ${count}`)
                              .join(" · ")
                          : "0"}
                      </span>
                      <span className="mx-1 text-ink-4">/</span>
                      <span className="text-blue-700">
                        분반{" "}
                        {Object.entries(row.classFinished).length
                          ? Object.entries(row.classFinished)
                              .map(([className, count]) => `${className} ${count}`)
                              .join(" · ")
                          : "0"}
                      </span>
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <p className="font-semibold text-ink">
                      {row.started}/{row.completed}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-ink-3">
                      중도 {row.abandoned} · 응시자 {row.uniqueFinishers}/{row.uniqueStarters}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-ink">
                    {pct(row.completionRate)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.completed ? (
                      <>
                        <p className="font-semibold text-ink">
                          평균 {row.averageScore.toFixed(1)}/{row.totalQuestions} (
                          {pct(row.averageAccuracy)})
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-ink-3">
                          최고 {row.bestScore} · 최저 {row.lowestScore}
                        </p>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                    {formatMinutes(row.averageDuration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
