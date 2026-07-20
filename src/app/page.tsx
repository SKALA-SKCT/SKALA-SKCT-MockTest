import Link from "next/link";
import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attempts,
  exams,
  questions,
  responses,
  SECTION_MINUTES,
  SUBJECTS,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import SubjectRadar from "@/components/SubjectRadar";
import TrendChart from "@/components/TrendChart";
import ExamStartButton from "@/components/ExamStartButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();

  const examList = await db
    .select()
    .from(exams)
    .where(eq(exams.published, true))
    .orderBy(asc(exams.createdAt));

  const publishedExamIds = examList.map((exam) => exam.id);

  // 통계는 유저·시험별 가장 최근 '완료' 응시 1개만 사용
  const finishedRows = publishedExamIds.length
    ? await db
        .select({
          id: attempts.id,
          userId: attempts.userId,
          examId: attempts.examId,
          finishedAt: attempts.finishedAt,
          campus: users.campus,
          classNumber: users.classNumber,
        })
        .from(attempts)
        .innerJoin(users, eq(users.id, attempts.userId))
        .where(
          and(
            isNotNull(attempts.finishedAt),
            inArray(attempts.examId, publishedExamIds)
          )
        )
    : [];
  const latestFinished = new Map<string, (typeof finishedRows)[number]>();
  for (const a of finishedRows) {
    const key = `${a.userId}:${a.examId}`;
    const current = latestFinished.get(key);
    if (!current || a.id > current.id) latestFinished.set(key, a);
  }
  const finished = [...latestFinished.values()];
  const myFinished = finished.filter((a) => a.userId === user.id);
  const myFinishedByExam = new Map(myFinished.map((attempt) => [attempt.examId, attempt]));
  const myFinishedExamIds = new Set(myFinished.map((a) => a.examId));
  const myUnfinished = publishedExamIds.length
    ? await db
        .select({
          id: attempts.id,
          examId: attempts.examId,
        })
        .from(attempts)
        .where(
          and(
            eq(attempts.userId, user.id),
            isNull(attempts.finishedAt),
            inArray(attempts.examId, publishedExamIds)
          )
        )
    : [];
  const myUnfinishedExamIds = new Set(myUnfinished.map((a) => a.examId));
  const attemptIds = finished.map((a) => a.id);
  const attemptsByExam = new Map<number, typeof finished>();
  for (const attempt of finished) {
    const items = attemptsByExam.get(attempt.examId) ?? [];
    items.push(attempt);
    attemptsByExam.set(attempt.examId, items);
  }

  // 응시별·과목별 정답 수
  const subjectCorrect = attemptIds.length
    ? await db
        .select({
          attemptId: responses.attemptId,
          subject: questions.subject,
          correct: sql<number>`count(*) filter (where ${responses.isCorrect})::int`,
        })
        .from(responses)
        .innerJoin(questions, eq(questions.id, responses.questionId))
        .where(inArray(responses.attemptId, attemptIds))
        .groupBy(responses.attemptId, questions.subject)
    : [];
  const correctOf = new Map<string, number>();
  const scoreByAttempt = new Map<number, number>();
  for (const r of subjectCorrect) {
    correctOf.set(`${r.attemptId}:${r.subject}`, r.correct);
    scoreByAttempt.set(
      r.attemptId,
      (scoreByAttempt.get(r.attemptId) ?? 0) + r.correct
    );
  }
  const scoreOf = (attemptId: number) => scoreByAttempt.get(attemptId) ?? 0;
  const isSameCampus = (attempt: (typeof finished)[number]) =>
    attempt.campus === user.campus;
  const isSameClass = (attempt: (typeof finished)[number]) =>
    attempt.campus === user.campus && attempt.classNumber === user.classNumber;
  const avgScore = (items: (typeof finished)[number][]) =>
    items.length
      ? items.reduce((acc, item) => acc + scoreOf(item.id), 0) / items.length
      : 0;

  // 시험별·과목별 문항 수
  const examSubjectTotals = await db
    .select({
      examId: questions.examId,
      subject: questions.subject,
      total: sql<number>`count(*)::int`,
    })
    .from(questions)
    .groupBy(questions.examId, questions.subject);
  const totalByExamSubject = new Map(
    examSubjectTotals.map((row) => [`${row.examId}:${row.subject}`, row.total])
  );
  const totalByExam = new Map<number, number>();
  for (const row of examSubjectTotals) {
    totalByExam.set(row.examId, (totalByExam.get(row.examId) ?? 0) + row.total);
  }
  const totalOfSubject = (examId: number, subject: string) =>
    totalByExamSubject.get(`${examId}:${subject}`) ?? 0;
  const totalOfExam = (examId: number) => totalByExam.get(examId) ?? 0;
  const subjectInfoOfExam = (examId: number) =>
    SUBJECTS.map((subject) => ({
      subject,
      total: totalOfSubject(examId, subject),
    })).filter((s) => s.total > 0);

  const rankOfAttempt = (target: (typeof finished)[number]) => {
    const peers = attemptsByExam.get(target.examId) ?? [];
    const myScoreForExam = scoreOf(target.id);
    return {
      rank: 1 + peers.filter((p) => scoreOf(p.id) > myScoreForExam).length,
      peers: peers.length,
    };
  };

  // ── 스탯 타일: 가장 최근 완료 회차 기준
  const latest = [...myFinished].sort(
    (a, b) => (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0)
  )[0];
  let tiles: {
    label: string;
    value: string;
    sub?: string;
    accent?: "up" | "down";
  }[] = [];
  if (latest) {
    const peers = attemptsByExam.get(latest.examId) ?? [];
    const campusPeers = peers.filter(isSameCampus);
    const classPeers = peers.filter(isSameClass);
    const myScore = scoreOf(latest.id);
    const total = totalOfExam(latest.examId);
    const groupAvg = avgScore(peers);
    const campusAvg = avgScore(campusPeers);
    const classAvg = avgScore(classPeers);
    const rank = rankOfAttempt(latest).rank;
    const averageRank =
      myFinished.reduce((acc, attempt) => acc + rankOfAttempt(attempt).rank, 0) /
      (myFinished.length || 1);
    const diff = Math.round(myScore - groupAvg);
    const campusDiff = Math.round(myScore - campusAvg);
    const classDiff = Math.round(myScore - classAvg);
    tiles = [
      {
        label: "최근 회차 점수",
        value: `${myScore}`,
        sub: `/${total}점`,
      },
      {
        label: "최근 회차 등수",
        value: `${rank}위`,
        sub: `/${peers.length}명`,
      },
      {
        label: "내 평균 등수",
        value: `${averageRank.toFixed(1)}위`,
        sub: `${myFinished.length}회 평균`,
      },
      {
        label: "그룹 평균과 차이",
        value: `${diff > 0 ? "+" : ""}${diff}`,
        sub: "점 (내 점수-평균)",
        accent: diff >= 0 ? "up" : "down",
      },
      {
        label: "내 캠퍼스 평균과 차이",
        value: `${campusDiff > 0 ? "+" : ""}${campusDiff}`,
        sub: `${user.campus} 평균 기준`,
        accent: campusDiff >= 0 ? "up" : "down",
      },
      {
        label: "내 분반 평균과 차이",
        value: `${classDiff > 0 ? "+" : ""}${classDiff}`,
        sub: `${user.campus} ${user.classNumber}반 평균 기준`,
        accent: classDiff >= 0 ? "up" : "down",
      },
    ];
  }

  // 회차 목록: 1~12회차. 제목("N회차 모의고사")으로 매핑
  const ROUNDS = 12;
  const examByRound = new Map<number, (typeof examList)[number]>();
  for (const [index, e] of examList.entries()) {
    const m = e.title.match(/^(\d+)회차/);
    if (m) {
      examByRound.set(Number(m[1]), e);
    } else if (index < ROUNDS) {
      examByRound.set(index + 1, e);
    }
  }

  // ── 추이: X축은 항상 1~12회차, 내 점수는 완료한 회차만 표시
  const trendData = Array.from({ length: ROUNDS }, (_, index) => {
    const round = index + 1;
    const exam = examByRound.get(round);
    const mine = exam ? myFinishedByExam.get(exam.id) : undefined;
    const peers = exam ? (attemptsByExam.get(exam.id) ?? []) : [];
    const campusPeers = peers.filter(isSameCampus);
    const classPeers = peers.filter(isSameClass);
    const total = exam ? totalOfExam(exam.id) || 1 : 1;
    const scoreToPoint = (score: number) => Math.round((score / total) * 100);
    return {
      name: `${round}회차`,
      나: mine ? scoreToPoint(scoreOf(mine.id)) : null,
      그룹평균: peers.length ? scoreToPoint(avgScore(peers)) : null,
      캠퍼스평균: campusPeers.length ? scoreToPoint(avgScore(campusPeers)) : null,
      분반평균: classPeers.length ? scoreToPoint(avgScore(classPeers)) : null,
    };
  });

  // ── 레이더: 과목별 누적 정답률 나 vs 그룹
  const radarData = SUBJECTS.map((s) => {
    let myC = 0,
      myT = 0,
      gC = 0,
      gT = 0,
      campusC = 0,
      campusT = 0,
      classC = 0,
      classT = 0;
    for (const a of finished) {
      const t = totalOfSubject(a.examId, s);
      if (t === 0) continue;
      const c = correctOf.get(`${a.id}:${s}`) ?? 0;
      gC += c;
      gT += t;
      if (isSameCampus(a)) {
        campusC += c;
        campusT += t;
      }
      if (isSameClass(a)) {
        classC += c;
        classT += t;
      }
      if (a.userId === user.id) {
        myC += c;
        myT += t;
      }
    }
    return {
      subject: s,
      나: myT ? Math.round((myC / myT) * 100) : 0,
      그룹평균: gT ? Math.round((gC / gT) * 100) : 0,
      캠퍼스평균: campusT ? Math.round((campusC / campusT) * 100) : 0,
      분반평균: classT ? Math.round((classC / classT) * 100) : 0,
    };
  });

  const rounds: {
    no: number;
    exam: (typeof examList)[number] | undefined;
    done: boolean;
    inProgress: boolean;
    locked: boolean;
  }[] = [];
  let allPreviousDone = true;
  for (let no = 1; no <= ROUNDS; no += 1) {
    const exam = examByRound.get(no);
    const done = exam ? myFinishedExamIds.has(exam.id) : false;
    const inProgress = exam ? myUnfinishedExamIds.has(exam.id) : false;
    rounds.push({
      no,
      exam,
      done,
      inProgress,
      locked: Boolean(exam) && !done && !allPreviousDone,
    });
    if (exam && !done) allPreviousDone = false;
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      {/* ── 좌측: 분석 대시보드 */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* 스탯 타일 */}
        {tiles.length > 0 && (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {tiles.map((t) => (
              <div key={t.label} className="metric-card px-5 py-4">
                <p className="text-xs font-medium text-ink-3">{t.label}</p>
                <p className="mt-1.5">
                  <span
                    className={`text-3xl font-bold tracking-tight ${
                      t.accent === "up"
                        ? "text-[#b98328]"
                        : t.accent === "down"
                          ? "text-brand"
                          : "text-ink"
                    }`}
                  >
                    {t.value}
                  </span>
                  {t.sub && (
                    <span className="ml-1 text-sm text-ink-3">{t.sub}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 차트 */}
        {myFinished.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="chart-card flex min-h-[360px] flex-col p-4">
              <h2 className="text-sm font-semibold text-ink">
                회차별 점수 추이
              </h2>
              <p className="mb-2 text-xs text-ink-3">완료한 회차 기준, 100점 만점</p>
              <TrendChart data={trendData} className="min-h-0 flex-1" />
            </div>
            <div className="chart-card flex min-h-[360px] flex-col p-4">
              <h2 className="text-sm font-semibold text-ink">유형별 점수</h2>
              <p className="mb-2 text-xs text-ink-3">전체 회차 누적, 100점 만점</p>
              <SubjectRadar data={radarData} className="min-h-0 flex-1" />
            </div>
          </div>
        ) : (
          <div className="card flex min-h-[460px] items-center justify-center px-6 py-12 text-center md:min-h-[640px]">
            <div className="mx-auto max-w-lg">
              <p className="text-xs font-semibold text-brand">
                첫 모의고사를 기다리는 중
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink">
                당신의 도전을 응원합니다.
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-3">
                우측 모의고사 목록에서 원하는 시험을 선택해 바로 응시할 수
                있습니다.
                <br />
                한 회차를 완료하면 이곳에 점수 추이와 유형별 분석이 표시됩니다.
              </p>
            </div>
          </div>
        )}

        {/* 유형별 상세 */}
        {myFinished.length > 0 && radarData.length > 0 && (
          <section>
            <div className="grid grid-cols-5 gap-2.5">
              {radarData.map((r) => {
                const diff = r.나 - r.그룹평균;
                const campusDiff = r.나 - (r.캠퍼스평균 ?? 0);
                const classDiff = r.나 - (r.분반평균 ?? 0);
                return (
                  <div
                    key={r.subject}
                    className="metric-card flex min-h-[142px] flex-col justify-between px-4 py-3"
                  >
                    <div>
                      <p className="truncate text-sm font-semibold text-ink-3">
                        {r.subject}
                      </p>
                      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink">
                        {r.나}점
                      </p>
                    </div>
                    <div className="grid gap-0.5 text-sm leading-5">
                      <p
                        className={`font-semibold ${
                          diff > 0
                            ? "text-[#b98328]"
                            : diff < 0
                              ? "text-brand"
                              : "text-ink-3"
                        }`}
                      >
                        그룹 {diff > 0 ? "+" : ""}
                        {diff}점
                      </p>
                      <p className="text-ink-3">
                        캠퍼스 {campusDiff > 0 ? "+" : ""}
                        {campusDiff}점
                      </p>
                      <p className="text-ink-3">
                        분반 {classDiff > 0 ? "+" : ""}
                        {classDiff}점
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── 우측: 모의고사 회차 패널 */}
      <aside className="w-full shrink-0 md:sticky md:top-24 md:w-72 lg:w-80">
        <div className="card flex flex-col">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">모의고사</h2>
            <p className="mt-1 text-xs text-ink-3">
              모의고사는 재응시할 수 없습니다.
            </p>
            <p className="mt-1 text-xs text-ink-3">
              1회차부터 순서대로 완료해야 다음 회차가 열립니다.
            </p>
          </div>
          <ul className="flex flex-1 flex-col divide-y divide-[var(--grid)] px-4">
            {rounds.map((r) => (
              <li key={r.no} className="flex flex-1 items-center gap-3 py-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    r.done
                      ? "border border-[#f4d4ce] bg-white text-brand"
                      : r.exam
                        ? "bg-page text-ink-2"
                        : "bg-page text-ink-3/50"
                  }`}
                >
                  {r.no}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-[13px] font-medium ${
                      r.exam ? "text-ink" : "text-ink-3/60"
                    }`}
                  >
                    {r.exam?.title ?? `${r.no}회차 모의고사`}
                  </p>
                  {r.done && (
                    <p className="text-[10px] font-medium text-[#b76458]">응시 완료</p>
                  )}
                  {r.inProgress && !r.done && (
                    <p className="text-[10px] text-brand">진행 중</p>
                  )}
                </div>
                {r.exam ? (
                  r.done ? (
                    <Link
                      href={`/exam/${r.exam.id}/result`}
                      className="rounded-lg border border-hairline px-2.5 py-1.5 text-[11px] font-semibold text-ink-2 transition hover:bg-page"
                    >
                      결과
                    </Link>
                  ) : r.inProgress ? (
                    <Link
                      href={`/exam/${r.exam.id}/take`}
                      className="rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90"
                    >
                      이어가기
                    </Link>
                  ) : r.locked ? (
                    <span className="rounded-lg bg-page px-2.5 py-1.5 text-[11px] font-medium text-ink-3">
                      잠김
                    </span>
                  ) : (
                    <ExamStartButton
                      examId={r.exam.id}
                      title={r.exam.title}
                      label="응시"
                      subjects={subjectInfoOfExam(r.exam.id)}
                      sectionMinutes={SECTION_MINUTES}
                      compact
                    />
                  )
                ) : (
                  <span className="rounded-lg bg-page px-2.5 py-1.5 text-[11px] font-medium text-ink-3/60">
                    준비 중
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
