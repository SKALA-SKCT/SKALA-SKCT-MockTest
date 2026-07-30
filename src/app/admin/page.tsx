import Link from "next/link";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attempts,
  CAMPUSES,
  exams,
  questions,
  responses,
  SUBJECTS,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { deleteAttemptRecord } from "@/lib/actions/admin";
import AdminCharts from "@/components/AdminCharts";
import AdminAnalytics from "@/components/AdminAnalytics";
import AccountInfoForm from "@/components/AccountInfoForm";

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
  return value === "users" || value === "analytics" ? value : "stats";
}

function campusLabel(value: string | null) {
  return value ?? "미지정";
}

function classLabel(campus: string | null, classNumber: number | null) {
  if (!campus || classNumber == null) return "미지정";
  return `${campus} ${classNumber}반`;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const currentAdmin = await requireAdmin();
  const params = await searchParams;
  const activeTab = normalizeTab(firstParam(params.tab));
  const userQuery = (firstParam(params.q) ?? "").trim();
  const campusFilter = firstParam(params.campus) ?? "all";
  const classFilter = firstParam(params.classNumber) ?? "all";
  const roleFilter = firstParam(params.role) ?? "all";
  const selectedUserId = Number(firstParam(params.userId) ?? "");

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
        examTitle: exams.title,
      })
      .from(attempts)
      .innerJoin(users, eq(users.id, attempts.userId))
      .innerJoin(exams, eq(exams.id, attempts.examId))
      .orderBy(desc(attempts.startedAt)),
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
    const key = campusLabel(user.campus);
    acc[key] = (acc[key] ?? 0) + 1;
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
        const key = campusLabel(attempt.campus);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {}
    );
    const classFinished = examFinished.reduce<Record<string, number>>(
      (acc, attempt) => {
        const key = classLabel(attempt.campus, attempt.classNumber);
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

  const groupScores = completedAttempts.reduce<
    Record<string, { completed: number; scoreSum: number }>
  >((acc, attempt) => {
    const campusKey = `campus:${campusLabel(attempt.campus)}`;
    const classKey = `class:${classLabel(attempt.campus, attempt.classNumber)}`;
    const score = scoreByAttempt.get(attempt.id) ?? 0;
    for (const key of [campusKey, classKey]) {
      const item = acc[key] ?? { completed: 0, scoreSum: 0 };
      item.completed += 1;
      item.scoreSum += score;
      acc[key] = item;
    }
    return acc;
  }, {});
  const campusChartData = ["판교", "울산", "광주", "미지정"].map((campus) => {
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
        .filter((classNumber): classNumber is number => classNumber != null)
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
        campusLabel(user.campus),
        user.classNumber == null ? "" : `${user.classNumber}반`,
      ]
        .join(" ")
        .toLowerCase();
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (campusFilter !== "all" && user.campus !== campusFilter) return false;
      if (classFilter !== "all" && user.classNumber !== Number(classFilter)) return false;
      if (roleFilter === "admin" && !user.isAdmin) return false;
      if (roleFilter === "user" && user.isAdmin) return false;
      return true;
    });

  const selectedUser =
    Number.isInteger(selectedUserId) && selectedUserId > 0
      ? filteredUsers.find((user) => user.id === selectedUserId) ??
        userRows.find((user) => user.id === selectedUserId)
      : null;
  const selectedUserAttempts = selectedUser
    ? attemptRows
        .filter((attempt) => attempt.userId === selectedUser.id)
        .map((attempt) => {
          const score = scoreByAttempt.get(attempt.id) ?? 0;
          const totalQuestions = totalByExam.get(attempt.examId) ?? 0;
          const duration = attempt.finishedAt
            ? (attempt.finishedAt.getTime() - attempt.startedAt.getTime()) / 60000
            : 0;
          return {
            ...attempt,
            score,
            totalQuestions,
            duration,
          };
        })
    : [];
  const selectedUserExamRows = selectedUser
    ? examList.map((exam) =>
        selectedUserAttempts.find((attempt) => attempt.examId === exam.id) ?? {
          id: null,
          examId: exam.id,
          examTitle: exam.title,
          startedAt: null,
          finishedAt: null,
          score: 0,
          totalQuestions: totalByExam.get(exam.id) ?? 0,
          duration: 0,
        }
      )
    : [];

  const userTabParams = new URLSearchParams();
  userTabParams.set("tab", "users");
  if (userQuery) userTabParams.set("q", userQuery);
  if (campusFilter !== "all") userTabParams.set("campus", campusFilter);
  if (classFilter !== "all") userTabParams.set("classNumber", classFilter);
  if (roleFilter !== "all") userTabParams.set("role", roleFilter);
  const userTabHref = `/admin?${userTabParams.toString()}`;
  const userModalHref = (userId: number) => {
    const nextParams = new URLSearchParams(userTabParams);
    nextParams.set("userId", String(userId));
    return `/admin?${nextParams.toString()}`;
  };

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
          href="/admin?tab=analytics"
          className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
            activeTab === "analytics"
              ? "border-brand text-brand"
              : "border-transparent text-ink-3 hover:text-ink"
          }`}
        >
          분석
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
      ) : activeTab === "analytics" ? (
        <AdminAnalytics />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-3">
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
              <p className="text-xs font-medium text-ink-3">관리자</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {userRows.filter((user) => user.isAdmin).length}명
              </p>
              <p className="mt-1 text-xs text-ink-3">권한 보유 계정</p>
            </div>
          </section>

          <section className="chart-card p-5">
            <form className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_150px_130px_150px_auto_auto]">
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
                  className="select-control h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
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
                  className="select-control h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
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
                  권한
                </span>
                <select
                  name="role"
                  defaultValue={roleFilter}
                  className="select-control h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
                >
                  <option value="all">전체</option>
                  <option value="admin">관리자</option>
                  <option value="user">일반</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="h-10 w-full rounded-[10px] bg-ink px-[18px] text-sm font-medium text-white shadow-sm transition hover:bg-brand hover:-translate-y-px"
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
                가입 정보와 응시 요약을 함께 확인합니다.
              </p>
            </div>
            <div>
              <table className="data-table table-fixed text-left text-[13px]">
                <thead>
                  <tr>
                    <th className="w-[12%] whitespace-nowrap px-4 py-2.5 font-semibold first:rounded-tl-2xl">
                      가입일
                    </th>
                    <th className="w-[12%] whitespace-nowrap px-4 py-2.5 font-semibold">
                      계정
                    </th>
                    <th className="w-[11%] whitespace-nowrap px-4 py-2.5 font-semibold">
                      아이디
                    </th>
                    <th className="w-[20%] whitespace-nowrap px-4 py-2.5 font-semibold">
                      이메일
                    </th>
                    <th className="w-[11%] whitespace-nowrap px-4 py-2.5 font-semibold">
                      캠퍼스/반
                    </th>
                    <th className="w-[7%] whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      응시
                    </th>
                    <th className="w-[7%] whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      완료
                    </th>
                    <th className="w-[6%] whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                      평균
                    </th>
                    <th className="w-[14%] whitespace-nowrap px-4 py-2.5 text-right font-semibold last:rounded-tr-2xl">
                      최근응시
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length ? (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="align-top">
                        <td className="whitespace-nowrap px-4 py-2.5 text-ink-3">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-ink">
                          <Link
                            href={userModalHref(user.id)}
                            className="font-bold text-ink underline-offset-4 hover:text-brand hover:underline"
                          >
                            {user.name}
                          </Link>
                          {user.isAdmin && (
                            <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-brand">
                              관리자
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-ink">
                          {user.nickname}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="max-w-[260px] truncate text-ink" title={user.email ?? ""}>
                            {user.email ?? "-"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-ink">
                          {classLabel(user.campus, user.classNumber)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                          {user.started}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                          {user.completed}
                          {user.abandoned > 0 && (
                            <span className="ml-1 whitespace-nowrap text-[11px] text-ink-3">
                              / 이탈 {user.abandoned}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                          {user.completed ? user.averageScore.toFixed(1) : "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right text-ink-3">
                          {formatDate(user.latestAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={9}
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
          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6">
              <Link
                href={userTabHref}
                aria-label="닫기"
                className="fixed inset-0 cursor-default"
              />
              <div className="relative w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-brand">
                      Account
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-ink">
                      {selectedUser.name}
                    </h2>
                  </div>
                  <Link
                    href={userTabHref}
                    className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm font-bold text-ink-2 transition hover:bg-page"
                  >
                    닫기
                  </Link>
                </div>

                <div className="grid items-start gap-5 p-5 lg:grid-cols-[0.9fr_1.6fr]">
                  <AccountInfoForm
                    key={selectedUser.id}
                    user={{
                      id: selectedUser.id,
                      name: selectedUser.name,
                      nickname: selectedUser.nickname,
                      email: selectedUser.email,
                      emailVerified: Boolean(selectedUser.emailVerifiedAt),
                      isAdmin: selectedUser.isAdmin,
                    }}
                    lockAdminToggle={
                      selectedUser.id === currentAdmin.id && selectedUser.isAdmin
                    }
                  />

                  <section className="min-w-0">
                    <div className="overflow-hidden rounded-xl border border-[#e1d8d3] bg-white">
                      <table className="data-table table-fixed text-left text-xs">
                        <thead>
                          <tr>
                            <th className="w-[43%] whitespace-nowrap px-3 py-2 font-semibold">
                              시험
                            </th>
                            <th className="w-[16%] whitespace-nowrap px-3 py-2 text-right font-semibold">
                              상태/점수
                            </th>
                            <th className="w-[28%] whitespace-nowrap px-3 py-2 text-right font-semibold">
                              시작
                            </th>
                            <th className="w-[13%] whitespace-nowrap px-3 py-2 text-right font-semibold">
                              관리
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUserExamRows.map((attempt) => (
                              <tr key={attempt.id ?? `exam-${attempt.examId}`} className="align-top">
                                <td className="px-3 py-2">
                                  <p
                                    className="truncate font-semibold text-ink"
                                    title={attempt.examTitle}
                                  >
                                    {attempt.examTitle}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-ink-3">
                                    {attempt.id
                                      ? `attempt #${attempt.id}`
                                      : "기록 없음"}
                                  </p>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                                  <p>
                                    {!attempt.id
                                      ? "미응시"
                                      : attempt.finishedAt
                                        ? "완료"
                                        : "진행"}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-ink-3">
                                    {attempt.id && attempt.finishedAt
                                      ? `${attempt.score}/${attempt.totalQuestions}`
                                      : "-"}
                                  </p>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right text-ink-3">
                                  {formatDate(attempt.startedAt)}
                                  <p className="mt-0.5 text-[11px]">
                                    {formatMinutes(attempt.duration)}
                                  </p>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right">
                                  {attempt.id && (
                                    <form action={deleteAttemptRecord}>
                                      <input
                                        type="hidden"
                                        name="attemptId"
                                        value={attempt.id}
                                      />
                                      <button
                                        type="submit"
                                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-brand transition hover:bg-red-100"
                                      >
                                        삭제
                                      </button>
                                    </form>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
