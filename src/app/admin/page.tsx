import Link from "next/link";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attempts,
  CAMPUSES,
  exams,
  questions,
  responses,
  SUBJECTS,
  users,
  maxClassForCampus,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import {
  deleteAttemptRecord,
  setUserAdminRole,
  updateUserInfo,
} from "@/lib/actions/admin";
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

function formatDate(value: Date | null) {
  if (!value) return "-";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(value)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
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

type AdminPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTab(value: string | undefined) {
  return value === "users" || value === "attempts" ? value : "stats";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const currentAdmin = await requireAdmin();
  const params = await searchParams;
  const activeTab = normalizeTab(firstParam(params.tab));
  const userQuery = (firstParam(params.q) ?? "").trim();
  const campusFilter = firstParam(params.campus) ?? "all";
  const classFilter = firstParam(params.classNumber) ?? "all";
  const verifyFilter = firstParam(params.verified) ?? "all";
  const roleFilter = firstParam(params.role) ?? "all";

  const [examList, userRows, attemptRows, questionTotals] = await Promise.all([
    db.select().from(exams).orderBy(asc(exams.createdAt)),
    db
      .select({
        id: users.id,
        nickname: users.nickname,
        name: users.name,
        email: users.email,
        campus: users.campus,
        classNumber: users.classNumber,
        emailVerifiedAt: users.emailVerifiedAt,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.createdAt)),
    db
      .select({
        id: attempts.id,
        userId: attempts.userId,
        examId: attempts.examId,
        startedAt: attempts.startedAt,
        finishedAt: attempts.finishedAt,
        campus: users.campus,
        classNumber: users.classNumber,
        name: users.name,
        nickname: users.nickname,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
        isAdmin: users.isAdmin,
        examTitle: exams.title,
      })
      .from(attempts)
      .innerJoin(users, eq(users.id, attempts.userId))
      .innerJoin(exams, eq(exams.id, attempts.examId))
      .orderBy(sql`${attempts.startedAt} desc`),
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

  const classOptions = Array.from(
    new Set(
      userRows
        .filter((user) => campusFilter === "all" || user.campus === campusFilter)
        .map((user) => user.classNumber)
    )
  ).sort((a, b) => a - b);

  const userAttemptSummary = new Map<
    number,
    {
      started: number;
      completed: number;
      abandoned: number;
      scoreSum: number;
      latestAt: Date | null;
    }
  >();
  for (const attempt of attemptRows) {
    const item = userAttemptSummary.get(attempt.userId) ?? {
      started: 0,
      completed: 0,
      abandoned: 0,
      scoreSum: 0,
      latestAt: null,
    };
    item.started += 1;
    if (attempt.finishedAt) {
      item.completed += 1;
      item.scoreSum += scoreByAttempt.get(attempt.id) ?? 0;
    } else {
      item.abandoned += 1;
    }
    if (!item.latestAt || attempt.startedAt > item.latestAt) {
      item.latestAt = attempt.startedAt;
    }
    userAttemptSummary.set(attempt.userId, item);
  }

  const normalizedQuery = userQuery.toLowerCase();
  const filteredUsers = userRows
    .map((user) => {
      const summary = userAttemptSummary.get(user.id) ?? {
        started: 0,
        completed: 0,
        abandoned: 0,
        scoreSum: 0,
        latestAt: null,
      };
      return {
        ...user,
        ...summary,
        averageScore: summary.completed ? summary.scoreSum / summary.completed : 0,
      };
    })
    .filter((user) => {
      const searchable = [
        user.name,
        user.nickname,
        user.email ?? "",
        user.campus,
        `${user.classNumber}반`,
      ]
        .join(" ")
        .toLowerCase();
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (campusFilter !== "all" && user.campus !== campusFilter) return false;
      if (classFilter !== "all" && user.classNumber !== Number(classFilter)) return false;
      if (verifyFilter === "verified" && !user.emailVerifiedAt) return false;
      if (verifyFilter === "unverified" && user.emailVerifiedAt) return false;
      if (roleFilter === "admin" && !user.isAdmin) return false;
      if (roleFilter === "user" && user.isAdmin) return false;
      return true;
    });

  const allClassNumbers = Array.from(
    { length: Math.max(...CAMPUSES.map((campus) => maxClassForCampus(campus))) },
    (_, index) => index + 1
  );

  const filteredAttempts = attemptRows
    .map((attempt) => {
      const score = scoreByAttempt.get(attempt.id) ?? 0;
      const totalQuestions = totalByExam.get(attempt.examId) ?? 0;
      const duration =
        attempt.finishedAt
          ? (attempt.finishedAt.getTime() - attempt.startedAt.getTime()) / 60000
          : 0;
      return {
        ...attempt,
        score,
        totalQuestions,
        duration,
        status: attempt.finishedAt ? "완료" : "진행/이탈",
      };
    })
    .filter((attempt) => {
      const searchable = [
        attempt.name,
        attempt.nickname,
        attempt.email ?? "",
        attempt.examTitle,
        attempt.campus,
        `${attempt.classNumber}반`,
      ]
        .join(" ")
        .toLowerCase();
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (campusFilter !== "all" && attempt.campus !== campusFilter) return false;
      if (classFilter !== "all" && attempt.classNumber !== Number(classFilter)) return false;
      if (verifyFilter === "verified" && !attempt.emailVerifiedAt) return false;
      if (verifyFilter === "unverified" && attempt.emailVerifiedAt) return false;
      if (roleFilter === "admin" && !attempt.isAdmin) return false;
      if (roleFilter === "user" && attempt.isAdmin) return false;
      return true;
    });

  return (
    <div className="space-y-6">
      <div>
        <div>
          <Link
            href="/"
            className="mb-2 inline-block text-sm text-zinc-500 hover:underline"
          >
            ← 목록으로
          </Link>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">
            관리자 통계
          </h1>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-hairline">
        <Link
          href="/admin"
          className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
            activeTab === "stats"
              ? "border-brand text-brand"
              : "border-transparent text-ink-3 hover:text-ink"
          }`}
        >
          통계
        </Link>
        <Link
          href="/admin?tab=users"
          className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
            activeTab === "users"
              ? "border-brand text-brand"
              : "border-transparent text-ink-3 hover:text-ink"
          }`}
        >
          회원
        </Link>
        <Link
          href="/admin?tab=attempts"
          className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
            activeTab === "attempts"
              ? "border-brand text-brand"
              : "border-transparent text-ink-3 hover:text-ink"
          }`}
        >
          응시 내역
        </Link>
      </nav>

      {activeTab === "stats" ? (
        <>
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">캠퍼스별 가입자</h2>
            <p className="mt-1 text-xs text-ink-3">회원 정보 기준</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {["판교", "울산", "광주"].map((campus) => (
              <div key={campus}>
                <p className="text-xs font-medium text-ink-3">{campus}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
                  {campusCounts[campus] ?? 0}명
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AdminCharts
        examData={examChartData}
        subjectData={subjectChartData}
        campusData={campusChartData}
        classData={classChartData}
      />

      <section>
        <div className="chart-card overflow-hidden">
          <div className="border-b border-hairline px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">그룹별 완료 통계</h2>
                <p className="mt-1 text-xs text-ink-3">
                  완료 응시 기준, 캠퍼스 요약과 분반 상세
                </p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-right">
                {campusChartData.map((row) => (
                  <div key={row.name}>
                    <p className="text-xs font-medium text-ink-3">{row.name}</p>
                    <p className="mt-0.5 text-sm font-bold text-ink">
                      {row.완료}명 · 평균 {row.평균점수}점
                    </p>
                  </div>
                ))}
              </div>
            </div>
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
                      <span className="text-[#8f7d73]">
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
        </>
      ) : activeTab === "users" ? (
        <>
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">전체 회원</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {userRows.length}명
              </p>
              <p className="mt-1 text-xs text-ink-3">가입 계정 기준</p>
            </div>
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">검색 결과</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {filteredUsers.length}명
              </p>
              <p className="mt-1 text-xs text-ink-3">현재 필터 적용</p>
            </div>
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">이메일 인증</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {userRows.filter((user) => user.emailVerifiedAt).length}명
              </p>
              <p className="mt-1 text-xs text-ink-3">인증 완료 계정</p>
            </div>
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">관리자</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {userRows.filter((user) => user.isAdmin).length}명
              </p>
              <p className="mt-1 text-xs text-ink-3">권한 보유 계정</p>
            </div>
          </section>

          <section className="chart-card p-5">
            <form className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_140px_120px_140px_140px_auto_auto]">
              <input type="hidden" name="tab" value="users" />
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                  검색
                </span>
                <input
                  name="q"
                  defaultValue={userQuery}
                  placeholder="이름, 아이디, 이메일"
                  className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                  캠퍼스
                </span>
                <select
                  name="campus"
                  defaultValue={campusFilter}
                  className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                >
                  <option value="all">전체</option>
                  {CAMPUSES.map((campus) => (
                    <option key={campus} value={campus}>
                      {campus}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                  반
                </span>
                <select
                  name="classNumber"
                  defaultValue={classFilter}
                  className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                >
                  <option value="all">전체</option>
                  {classOptions.map((classNumber) => (
                    <option key={classNumber} value={classNumber}>
                      {classNumber}반
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                  이메일
                </span>
                <select
                  name="verified"
                  defaultValue={verifyFilter}
                  className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                >
                  <option value="all">전체</option>
                  <option value="verified">인증 완료</option>
                  <option value="unverified">미인증</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                  권한
                </span>
                <select
                  name="role"
                  defaultValue={roleFilter}
                  className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                >
                  <option value="all">전체</option>
                  <option value="admin">관리자</option>
                  <option value="user">일반</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="h-10 w-full rounded-lg bg-brand px-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-600"
                >
                  적용
                </button>
              </div>
              <div className="flex items-end">
                <Link
                  href="/admin?tab=users"
                  className="flex h-10 w-full items-center justify-center rounded-lg border border-hairline bg-white px-4 text-sm font-bold text-ink-2 transition hover:bg-page"
                >
                  초기화
                </Link>
              </div>
            </form>
          </section>

          <section className="chart-card overflow-hidden">
            <div className="border-b border-hairline px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">회원 목록</h2>
              <p className="mt-1 text-xs text-ink-3">
                가입 정보 수정, 인증 상태, 관리자 권한을 함께 관리합니다.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[1320px] text-left text-[13px]">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold first:rounded-tl-2xl">
                      가입일
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      이름
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      아이디
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      이메일
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      인증
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      캠퍼스/반
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      응시
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      평균
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      권한
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold last:rounded-tr-2xl">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length ? (
                    filteredUsers.map((user) => {
                      const editFormId = `edit-user-${user.id}`;
                      return (
                        <tr key={user.id} className="align-top">
                          <td className="whitespace-nowrap px-4 py-2.5 text-ink-3">
                            <form id={editFormId} action={updateUserInfo}>
                              <input type="hidden" name="userId" value={user.id} />
                            </form>
                            <p>{formatDate(user.createdAt)}</p>
                            <p className="mt-1 text-[11px] text-ink-3">
                              최근 {formatDate(user.latestAt)}
                            </p>
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              form={editFormId}
                              name="name"
                              defaultValue={user.name}
                              className="h-9 w-24 rounded-lg border border-hairline bg-white px-2 text-sm font-semibold text-ink outline-none focus:border-brand"
                            />
                            {user.isAdmin && (
                              <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-brand">
                                관리자
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              form={editFormId}
                              name="nickname"
                              defaultValue={user.nickname}
                              className="h-9 w-28 rounded-lg border border-hairline bg-white px-2 text-sm text-ink outline-none focus:border-brand"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              form={editFormId}
                              name="email"
                              type="email"
                              defaultValue={user.email ?? ""}
                              placeholder="이메일 없음"
                              className="h-9 w-56 rounded-lg border border-hairline bg-white px-2 text-sm text-ink outline-none focus:border-brand"
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-hairline bg-white px-2 text-xs font-semibold text-ink">
                              <input
                                form={editFormId}
                                type="checkbox"
                                name="emailVerified"
                                value="true"
                                defaultChecked={Boolean(user.emailVerifiedAt)}
                                className="h-4 w-4 accent-red-500"
                              />
                              인증
                            </label>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <div className="flex gap-2">
                              <select
                                form={editFormId}
                                name="campus"
                                defaultValue={user.campus}
                                className="h-9 rounded-lg border border-hairline bg-white px-2 text-sm text-ink outline-none focus:border-brand"
                              >
                                {CAMPUSES.map((campus) => (
                                  <option key={campus} value={campus}>
                                    {campus}
                                  </option>
                                ))}
                              </select>
                              <select
                                form={editFormId}
                                name="classNumber"
                                defaultValue={user.classNumber}
                                className="h-9 rounded-lg border border-hairline bg-white px-2 text-sm text-ink outline-none focus:border-brand"
                              >
                                {allClassNumbers.map((classNumber) => (
                                  <option key={classNumber} value={classNumber}>
                                    {classNumber}반
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                            {user.started}건
                            {user.abandoned > 0 && (
                              <p className="mt-1 text-[11px] text-ink-3">
                                이탈 {user.abandoned}
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                            {user.completed ? user.averageScore.toFixed(1) : "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right">
                            <form action={setUserAdminRole}>
                              <input type="hidden" name="userId" value={user.id} />
                              <input
                                type="hidden"
                                name="isAdmin"
                                value={user.isAdmin ? "false" : "true"}
                              />
                              <button
                                type="submit"
                                disabled={user.id === currentAdmin.id && user.isAdmin}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                  user.id === currentAdmin.id && user.isAdmin
                                    ? "cursor-not-allowed border border-hairline bg-page text-ink-4"
                                    : user.isAdmin
                                      ? "border border-hairline bg-white text-ink-2 hover:bg-page"
                                      : "bg-brand text-white hover:bg-red-600"
                                }`}
                              >
                                {user.isAdmin
                                  ? user.id === currentAdmin.id
                                    ? "본인"
                                    : "권한 회수"
                                  : "관리자 부여"}
                              </button>
                            </form>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right">
                            <button
                              form={editFormId}
                              type="submit"
                              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black"
                            >
                              저장
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-5 py-10 text-center text-sm text-ink-3"
                      >
                        조건에 맞는 회원이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">전체 응시</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {attemptRows.length}건
              </p>
              <p className="mt-1 text-xs text-ink-3">시작 기록 전체</p>
            </div>
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">검색 결과</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {filteredAttempts.length}건
              </p>
              <p className="mt-1 text-xs text-ink-3">현재 필터 적용</p>
            </div>
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">완료</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {completedAttempts.length}건
              </p>
              <p className="mt-1 text-xs text-ink-3">결과 산출 가능</p>
            </div>
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">진행/이탈</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {abandonedAttempts.length}건
              </p>
              <p className="mt-1 text-xs text-ink-3">미완료 기록</p>
            </div>
          </section>

          <section className="chart-card p-5">
            <form className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_140px_120px_140px_140px_auto_auto]">
              <input type="hidden" name="tab" value="attempts" />
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                  검색
                </span>
                <input
                  name="q"
                  defaultValue={userQuery}
                  placeholder="이름, 아이디, 시험명"
                  className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                  캠퍼스
                </span>
                <select
                  name="campus"
                  defaultValue={campusFilter}
                  className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                >
                  <option value="all">전체</option>
                  {CAMPUSES.map((campus) => (
                    <option key={campus} value={campus}>
                      {campus}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                  반
                </span>
                <select
                  name="classNumber"
                  defaultValue={classFilter}
                  className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                >
                  <option value="all">전체</option>
                  {classOptions.map((classNumber) => (
                    <option key={classNumber} value={classNumber}>
                      {classNumber}반
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                  이메일
                </span>
                <select
                  name="verified"
                  defaultValue={verifyFilter}
                  className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                >
                  <option value="all">전체</option>
                  <option value="verified">인증 완료</option>
                  <option value="unverified">미인증</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink-3">
                  권한
                </span>
                <select
                  name="role"
                  defaultValue={roleFilter}
                  className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                >
                  <option value="all">전체</option>
                  <option value="admin">관리자</option>
                  <option value="user">일반</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="h-10 w-full rounded-lg bg-brand px-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-600"
                >
                  적용
                </button>
              </div>
              <div className="flex items-end">
                <Link
                  href="/admin?tab=attempts"
                  className="flex h-10 w-full items-center justify-center rounded-lg border border-hairline bg-white px-4 text-sm font-bold text-ink-2 transition hover:bg-page"
                >
                  초기화
                </Link>
              </div>
            </form>
          </section>

          <section className="chart-card overflow-hidden">
            <div className="border-b border-hairline px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">응시 내역</h2>
              <p className="mt-1 text-xs text-ink-3">
                완료/미완료 응시 기록을 확인하고 필요 시 삭제합니다.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[1180px] text-left text-[13px]">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold first:rounded-tl-2xl">
                      시작
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      사용자
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      시험
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      상태
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      점수
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      소요시간
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      완료
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold last:rounded-tr-2xl">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.length ? (
                    filteredAttempts.map((attempt) => (
                      <tr key={attempt.id} className="align-top">
                        <td className="whitespace-nowrap px-4 py-2.5 text-ink-3">
                          {formatDate(attempt.startedAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-ink">
                            {attempt.name}
                            {attempt.isAdmin && (
                              <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-brand">
                                관리자
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-[11px] text-ink-3">
                            {attempt.nickname} · {attempt.campus} {attempt.classNumber}반
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="max-w-[360px] truncate font-semibold text-ink" title={attempt.examTitle}>
                            {attempt.examTitle}
                          </p>
                          <p className="mt-1 text-[11px] text-ink-3">
                            attempt #{attempt.id}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                              attempt.finishedAt
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {attempt.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                          {attempt.finishedAt
                            ? `${attempt.score}/${attempt.totalQuestions}`
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                          {formatMinutes(attempt.duration)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right text-ink-3">
                          {formatDate(attempt.finishedAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <form action={deleteAttemptRecord}>
                            <input type="hidden" name="attemptId" value={attempt.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-brand transition hover:bg-red-100"
                            >
                              기록 삭제
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm text-ink-3"
                      >
                        조건에 맞는 응시 기록이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
