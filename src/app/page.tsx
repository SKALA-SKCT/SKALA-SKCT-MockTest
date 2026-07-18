import Link from "next/link";
import { asc, eq, inArray, sql } from "drizzle-orm";
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

  const allAttempts = await db.select().from(attempts);
  const allUsers = await db.select().from(users);
  const userById = new Map(allUsers.map((row) => [row.id, row]));

  // 통계는 유저·시험별 가장 최근 '완료' 응시 1개만 사용
  const latestFinished = new Map<string, (typeof allAttempts)[number]>();
  for (const a of allAttempts) {
    if (!a.finishedAt) continue;
    const k = `${a.userId}:${a.examId}`;
    const cur = latestFinished.get(k);
    if (!cur || a.id > cur.id) latestFinished.set(k, a);
  }
  const finished = [...latestFinished.values()];
  const myFinished = finished.filter((a) => a.userId === user.id);
  const myFinishedExamIds = new Set(myFinished.map((a) => a.examId));
  const attemptIds = finished.map((a) => a.id);

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
  for (const r of subjectCorrect)
    correctOf.set(`${r.attemptId}:${r.subject}`, r.correct);
  const scoreOf = (attemptId: number) =>
    SUBJECTS.reduce((acc, s) => acc + (correctOf.get(`${attemptId}:${s}`) ?? 0), 0);
  const isSameCampus = (attempt: (typeof finished)[number]) =>
    userById.get(attempt.userId)?.campus === user.campus;
  const isSameClass = (attempt: (typeof finished)[number]) => {
    const attemptUser = userById.get(attempt.userId);
    return (
      attemptUser?.campus === user.campus &&
      attemptUser.classNumber === user.classNumber
    );
  };
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
  const totalOfSubject = (examId: number, subject: string) =>
    examSubjectTotals.find((r) => r.examId === examId && r.subject === subject)
      ?.total ?? 0;
  const totalOfExam = (examId: number) =>
    examSubjectTotals
      .filter((r) => r.examId === examId)
      .reduce((acc, r) => acc + r.total, 0);
  const subjectInfoOfExam = (examId: number) =>
    SUBJECTS.map((subject) => ({
      subject,
      total: totalOfSubject(examId, subject),
    })).filter((s) => s.total > 0);

  const rankOfAttempt = (target: (typeof finished)[number]) => {
    const peers = finished.filter((a) => a.examId === target.examId);
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
    const peers = finished.filter((a) => a.examId === latest.examId);
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
        sub: `/${total}문항`,
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
        sub: "문항 (내 점수-평균)",
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

  // ── 추이: 완료 회차별 정답률(%) 나 vs 그룹
  const trendData = examList
    .filter((e) => myFinished.some((a) => a.examId === e.id))
    .map((e) => {
      const mine = myFinished.find((a) => a.examId === e.id)!;
      const peers = finished.filter((a) => a.examId === e.id);
      const campusPeers = peers.filter(isSameCampus);
      const classPeers = peers.filter(isSameClass);
      const total = totalOfExam(e.id) || 1;
      const groupAvg = avgScore(peers);
      const campusAvg = avgScore(campusPeers);
      const classAvg = avgScore(classPeers);
      return {
        name: e.title.length > 10 ? e.title.slice(0, 10) + "…" : e.title,
        나: Math.round((scoreOf(mine.id) / total) * 100),
        그룹평균: Math.round((groupAvg / total) * 100),
        캠퍼스평균: Math.round((campusAvg / total) * 100),
        분반평균: Math.round((classAvg / total) * 100),
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
  const rounds = Array.from({ length: ROUNDS }, (_, i) => {
    const exam = examByRound.get(i + 1);
    const locked =
      Boolean(exam) &&
      !myFinishedExamIds.has(exam!.id) &&
      Array.from({ length: i }, (_, prevIndex) => examByRound.get(prevIndex + 1))
        .filter(Boolean)
        .some((previousExam) => !myFinishedExamIds.has(previousExam!.id));
    return {
      no: i + 1,
      exam,
      done: exam ? myFinishedExamIds.has(exam.id) : false,
      locked,
    };
  });

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      {/* ── 좌측: 분석 대시보드 */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {/* 스탯 타일 */}
        {tiles.length > 0 && (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {tiles.map((t) => (
              <div key={t.label} className="card px-5 py-4">
                <p className="text-xs font-medium text-ink-3">{t.label}</p>
                <p className="mt-1.5">
                  <span
                    className={`text-3xl font-bold tracking-tight ${
                      t.accent === "up"
                        ? "text-[#006300]"
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
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink">
                회차별 정답률 추이
              </h2>
              <p className="mb-2 text-xs text-ink-3">완료한 회차 기준, %</p>
              <TrendChart data={trendData} />
            </div>
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink">유형별 정답률</h2>
              <p className="mb-2 text-xs text-ink-3">전체 회차 누적, %</p>
              <SubjectRadar data={radarData} />
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
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">유형별 상세</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {radarData.map((r) => {
                const diff = r.나 - r.그룹평균;
                const campusDiff = r.나 - (r.캠퍼스평균 ?? 0);
                const classDiff = r.나 - (r.분반평균 ?? 0);
                return (
                  <div
                    key={r.subject}
                    className="rounded-xl border border-hairline px-4 py-3"
                  >
                    <p className="text-xs text-ink-3">{r.subject}</p>
                    <p className="mt-1 text-xl font-bold">{r.나}%</p>
                    <p
                      className={`mt-0.5 text-xs font-medium ${
                        diff > 0
                          ? "text-[#006300]"
                          : diff < 0
                            ? "text-brand"
                            : "text-ink-3"
                      }`}
                    >
                      그룹 평균과 차이 {diff > 0 ? "+" : ""}
                      {diff}%p
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-ink-3">
                      캠퍼스 평균과 차이 {campusDiff > 0 ? "+" : ""}
                      {campusDiff}%p
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-ink-3">
                      분반 평균과 차이 {classDiff > 0 ? "+" : ""}
                      {classDiff}%p
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 우측: 모의고사 회차 패널 */}
      <aside className="w-full shrink-0 md:sticky md:top-24 md:w-72 lg:w-80">
        <div className="card flex max-h-[calc(100vh-8rem)] flex-col">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">모의고사</h2>
            <p className="mt-1 text-xs text-ink-3">
              모의고사는 재응시할 수 없습니다.
            </p>
            <p className="mt-1 text-xs text-ink-3">
              1회차부터 순서대로 완료해야 다음 회차가 열립니다.
            </p>
          </div>
          <ul className="flex-1 divide-y divide-[var(--grid)] overflow-y-auto px-5">
            {rounds.map((r) => (
              <li key={r.no} className="flex items-center gap-3 py-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    r.done
                      ? "bg-[#0ca30c]/10 text-[#006300]"
                      : r.exam
                        ? "bg-page text-ink-2"
                        : "bg-page text-ink-3/50"
                  }`}
                >
                  {r.no}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-medium ${
                      r.exam ? "text-ink" : "text-ink-3/60"
                    }`}
                  >
                    {r.exam?.title ?? `${r.no}회차 모의고사`}
                  </p>
                  {r.done && (
                    <p className="text-[11px] text-[#006300]">응시 완료</p>
                  )}
                </div>
                {r.exam ? (
                  r.done ? (
                    <Link
                      href={`/exam/${r.exam.id}/result`}
                      className="rounded-lg border border-hairline px-3 py-1.5 text-[11px] font-semibold text-ink-2 transition hover:bg-page"
                    >
                      결과
                    </Link>
                  ) : r.locked ? (
                    <span className="rounded-lg bg-page px-3 py-1.5 text-[11px] font-medium text-ink-3">
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
                  <span className="rounded-lg bg-page px-3 py-1.5 text-[11px] font-medium text-ink-3/60">
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
