import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attempts,
  attemptResults,
  exams,
  questions,
  SECTION_MINUTES,
  SUBJECTS,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { getMotherLoginUrl } from "@/lib/mother-auth";
import TrendChart from "@/components/TrendChart";
import ExamStartButton from "@/components/ExamStartButton";

export const dynamic = "force-dynamic";

// 모든 유저에게 동일하고 거의 안 바뀌는 쿼리는 60초 캐시(방문마다 DB 왕복 제거).
// 쿠키 등 요청별 값에 의존하지 않으므로 캐시 스코프 안에서 안전하다.
const getPublishedExams = unstable_cache(
  async () =>
    db
      .select()
      .from(exams)
      .where(eq(exams.published, true))
      .orderBy(asc(exams.createdAt)),
  ["dashboard:published-exams"],
  { revalidate: 60, tags: ["exams"] }
);

const getExamSubjectTotals = unstable_cache(
  async () =>
    db
      .select({
        examId: questions.examId,
        subject: questions.subject,
        total: sql<number>`count(*)::int`,
      })
      .from(questions)
      .groupBy(questions.examId, questions.subject),
  ["dashboard:exam-subject-totals"],
  { revalidate: 60, tags: ["questions"] }
);

type DashboardProps = {
  searchParams: Promise<{ sso?: string | string[] }>;
};

export default async function Dashboard({ searchParams }: DashboardProps) {
  const user = await getCurrentUser();
  if (!user) {
    const { sso } = await searchParams;

    // Mother에서 이미 돌아온 요청을 다시 Mother로 보내면 두 앱 사이에
    // 무한 리다이렉트가 생긴다. MockPractice와 동일하게 한 번만 왕복한다.
    if (sso === "1") {
      return (
        <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center px-6 py-16">
          <section className="w-full rounded-2xl border border-hairline bg-surface p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold">로그인 세션을 확인하지 못했어요</h1>
            <p className="mt-3 leading-7 text-muted">
              통합 로그인 설정을 확인하는 중입니다. 잠시 후 다시 시도해 주세요.
            </p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-5 font-medium text-background"
              href={getMotherLoginUrl("/")}
            >
              다시 로그인하기
            </Link>
          </section>
        </main>
      );
    }

    redirect(getMotherLoginUrl("/"));
  }

  // 서로 의존이 없는 쿼리는 병렬 실행(순차 왕복 2회 → 1회).
  const [examList, examSubjectTotals] = await Promise.all([
    getPublishedExams(),
    getExamSubjectTotals(),
  ]);

  const publishedExamIds = examList.map((exam) => exam.id);

  // 통계는 유저·시험별 첫 '완료' 응시 1개만 사용해 재응시 점수가 대시보드에 섞이지 않게 한다.
  // 총점·과목별 점수는 채점 시 저장한 스냅샷(attempt_results)에 이미 들어 있으므로
  // responses를 다시 집계하지 않고 조인 한 번으로 가져온다.
  const finishedRows = publishedExamIds.length
    ? await db
        .select({
          id: attempts.id,
          userId: attempts.userId,
          examId: attempts.examId,
          finishedAt: attempts.finishedAt,
          totalScore: attemptResults.totalScore,
          subjectScores: sql<
            Partial<Record<(typeof SUBJECTS)[number], number>>
          >`${attemptResults.snapshot} -> 'subjectScores'`,
        })
        .from(attempts)
        .innerJoin(attemptResults, eq(attemptResults.attemptId, attempts.id))
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
    if (!current || a.id < current.id) latestFinished.set(key, a);
  }
  const finished = [...latestFinished.values()];
  const myFinished = finished.filter((a) => a.userId === user.id);
  const myFinishedByExam = new Map(myFinished.map((attempt) => [attempt.examId, attempt]));
  const myFinishedExamIds = new Set(myFinished.map((a) => a.examId));
  const attemptsByExam = new Map<number, typeof finished>();
  for (const attempt of finished) {
    const items = attemptsByExam.get(attempt.examId) ?? [];
    items.push(attempt);
    attemptsByExam.set(attempt.examId, items);
  }

  // 응시별·과목별 정답 수
  const correctOf = new Map<string, number>();
  const scoreByAttempt = new Map<number, number>();
  for (const attempt of finished) {
    scoreByAttempt.set(attempt.id, attempt.totalScore);
    for (const subject of SUBJECTS) {
      correctOf.set(
        `${attempt.id}:${subject}`,
        attempt.subjectScores?.[subject] ?? 0
      );
    }
  }
  const scoreOf = (attemptId: number) => scoreByAttempt.get(attemptId) ?? 0;
  const avgScore = (items: (typeof finished)[number][]) =>
    items.length
      ? items.reduce((acc, item) => acc + scoreOf(item.id), 0) / items.length
      : 0;

  // 시험별·과목별 문항 수 (examSubjectTotals는 위에서 병렬로 조회됨)
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
    const myScore = scoreOf(latest.id);
    const total = totalOfExam(latest.examId);
    const groupAvg = avgScore(peers);
    const rank = rankOfAttempt(latest).rank;
    const averageRank =
      myFinished.reduce((acc, attempt) => acc + rankOfAttempt(attempt).rank, 0) /
      (myFinished.length || 1);
    const diff = Math.round(myScore - groupAvg);
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
        label: "전체 평균과 차이",
        value: `${diff > 0 ? "+" : ""}${diff}`,
        sub: "점 (내 점수-평균)",
        accent: diff >= 0 ? "up" : "down",
      },
    ];
  }

  // 모의고사 세트 목록: 1~12세트. 제목("N회차 모의고사")으로 매핑
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

  // ── 추이: X축은 항상 1~12세트, 내 점수는 완료한 세트만 표시
  const trendData = Array.from({ length: ROUNDS }, (_, index) => {
    const round = index + 1;
    const exam = examByRound.get(round);
    const mine = exam ? myFinishedByExam.get(exam.id) : undefined;
    const peers = exam ? (attemptsByExam.get(exam.id) ?? []) : [];
    const total = exam ? totalOfExam(exam.id) || 1 : 1;
    const scoreToPoint = (score: number) => Math.round((score / total) * 100);
    return {
      name: `${round}세트`,
      나: mine ? scoreToPoint(scoreOf(mine.id)) : null,
      그룹평균: peers.length ? scoreToPoint(avgScore(peers)) : null,
    };
  });

  // ── 레이더: 과목별 누적 정답률 나 vs 전체
  const radarData = SUBJECTS.map((s) => {
    let myC = 0,
      myT = 0,
      gC = 0,
      gT = 0;
    for (const a of finished) {
      const t = totalOfSubject(a.examId, s);
      if (t === 0) continue;
      const c = correctOf.get(`${a.id}:${s}`) ?? 0;
      gC += c;
      gT += t;
      if (a.userId === user.id) {
        myC += c;
        myT += t;
      }
    }
    return {
      subject: s,
      나: myT ? Math.round((myC / myT) * 100) : 0,
      그룹평균: gT ? Math.round((gC / gT) * 100) : 0,
    };
  });

  const rounds: {
    no: number;
    exam: (typeof examList)[number] | undefined;
    done: boolean;
    locked: boolean;
  }[] = [];
  const examListTitle = (title: string | undefined, round: number) =>
    (title ?? `${round}회차 모의고사`).replace(/^SK\s+/i, "");
  let allPreviousDone = true;
  for (let no = 1; no <= ROUNDS; no += 1) {
    const exam = examByRound.get(no);
    const done = exam ? myFinishedExamIds.has(exam.id) : false;
    rounds.push({
      no,
      exam,
      done,
      locked: Boolean(exam) && !done && !allPreviousDone,
    });
    if (exam && !done) allPreviousDone = false;
  }

  return (
    <div className="mx-auto w-full max-w-[78rem]">
      <div className="grid gap-4 xl:h-[min(720px,calc(100vh-8rem))] xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-stretch">
      {/* ── 중앙: 분석 대시보드 */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 xl:h-full xl:min-h-0">
        <div className="mb-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            실전 모의고사
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-3">
            실제 시험과 같은 구성과 제한 시간 안에서 문제를 풀고 결과를
            분석하며 실전 감각을 익힐 수 있습니다.
          </p>
        </div>
        {/* 스탯 타일 */}
        {tiles.length > 0 && (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="metric-card px-4 py-3">
                <p className="text-xs font-medium text-ink-3">{t.label}</p>
                <p className="mt-1.5">
                  <span
                    className={`text-2xl font-bold tracking-tight ${
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
          <div className="grid min-h-0 flex-1 gap-3">
            <div className="chart-card flex min-h-0 flex-col p-3.5">
              <TrendChart
                data={trendData}
                className="min-h-0 flex-1"
                title="회차별 점수 추이"
                description="완료한 모의고사의 1회차 기준, 100점 만점"
              />
            </div>
          </div>
        ) : (
          <div className="card flex h-full min-h-[500px] items-center justify-center px-6 py-10 text-center xl:min-h-0">
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
            <div className="grid grid-cols-5 gap-2">
              {radarData.map((r) => {
                const diff = r.나 - r.그룹평균;
                return (
                  <div
                    key={r.subject}
                    className="metric-card flex min-h-[108px] flex-col justify-between px-3.5 py-2.5"
                  >
                    <div>
                      <p className="truncate text-sm font-semibold text-ink-3">
                        {r.subject}
                      </p>
                      <p className="mt-1 text-xl font-extrabold tracking-tight text-ink">
                        {r.나}점
                      </p>
                    </div>
                    <div className="grid gap-0.5 text-xs leading-4">
                      <p
                        className={`font-semibold ${
                          diff > 0
                            ? "text-[#b98328]"
                            : diff < 0
                              ? "text-brand"
                              : "text-ink-3"
                        }`}
                      >
                        전체 {diff > 0 ? "+" : ""}
                        {diff}점
                      </p>
                      <p className="text-ink-3">
                        전체 평균 대비
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
      <aside className="min-h-0 w-full shrink-0 xl:flex xl:h-full">
        <div className="card flex h-full min-h-[500px] w-full flex-col overflow-hidden xl:min-h-0">
          <div className="border-b border-hairline px-4 py-3.5">
            <h2 className="text-sm font-semibold text-ink">모의고사</h2>
            <p className="mt-1 text-xs text-ink-3">
              완료한 모의고사는 다시 응시할 수 있습니다.
            </p>
            <p className="mt-1 text-xs text-ink-3">
              모든 회차별 분석을 확인하실 수 있습니다.
            </p>
          </div>
          <ul className="soft-scrollbar flex min-h-0 flex-1 flex-col divide-y divide-[var(--grid)] overflow-y-auto px-3.5">
            {rounds.map((r) => (
              <li key={r.no} className="flex flex-1 items-center gap-2.5 py-2">
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
                    {examListTitle(r.exam?.title, r.no)}
                  </p>
                  {r.done && (
                    <p className="text-[10px] font-medium text-[#b76458]">응시 완료</p>
                  )}
                </div>
                {r.exam ? (
                  r.done ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <ExamStartButton
                        examId={r.exam.id}
                        title={r.exam.title}
                        label="재응시"
                        subjects={subjectInfoOfExam(r.exam.id)}
                        sectionMinutes={SECTION_MINUTES}
                        compact
                      />
                      <Link
                        href={`/exam/${r.exam.id}/result`}
                        className="rounded-[10px] border border-black/10 bg-white px-2.5 py-1.5 text-[11px] font-medium text-ink-2 transition hover:border-black/20 hover:bg-black/[0.04] hover:-translate-y-px"
                      >
                        결과
                      </Link>
                    </div>
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
    </div>
  );
}
