import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attempts,
  exams,
  questions,
  responses,
  SECTION_MINUTES,
  SUBJECTS,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import SubjectRadar from "@/components/SubjectRadar";
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

const landingGuideSections = [
  {
    eyebrow: "Start",
    title: "1회차부터 순서대로 응시",
    body: "처음 접속하면 모의고사 목록에서 1회차만 응시할 수 있습니다. 한 회차를 완료해야 다음 회차가 열립니다.",
    image: "/help/empty-dashboard.png",
    imageWidth: 2602,
    imageHeight: 1750,
    tone: "bg-red-50 text-brand",
    hideBottomShadow: true,
  },
  {
    eyebrow: "Exam Info",
    title: "시험 구성 확인 후 시작",
    body: "응시 버튼을 누르면 유형 수, 총 시간, 유형별 문항 수와 시간을 확인할 수 있습니다. 시작 후에는 재응시할 수 없습니다.",
    image: "/help/exam-intro.png",
    imageWidth: 2598,
    imageHeight: 1760,
    tone: "bg-zinc-100 text-ink",
  },
  {
    eyebrow: "Section",
    title: "유형별 안내 확인",
    body: "각 유형은 20문항, 15분으로 진행됩니다. 유형 안에서는 문항 번호를 눌러 자유롭게 이동할 수 있습니다.",
    image: "/help/section-start.png",
    imageWidth: 2594,
    imageHeight: 1770,
    tone: "bg-amber-50 text-amber-700",
    hideBottomShadow: true,
  },
  {
    eyebrow: "Solving",
    title: "메모장, 그림판, 계산기와 함께 풀이",
    body: "풀이 화면에서는 메모장과 그림판을 사용할 수 있고, 수열추리 등 계산이 필요한 유형에서는 계산기도 함께 제공합니다.",
    image: "/help/exam-taking.png",
    imageWidth: 2640,
    imageHeight: 1492,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    eyebrow: "Submit",
    title: "미응답이 있어도 유형 제출 가능",
    body: "다음 유형으로 넘어갈 때 미응답 문항 수를 확인한 뒤 제출할 수 있습니다. 제출한 유형은 다시 풀 수 없습니다.",
    image: "/help/submit-confirm.png",
    imageWidth: 2320,
    imageHeight: 1760,
    tone: "bg-red-50 text-brand",
  },
  {
    eyebrow: "Exit",
    title: "응시 중단 시 기록 초기화",
    body: "응시 도중 나가기를 선택하면 이번 응시 기록과 저장된 답안이 모두 초기화됩니다.",
    image: "/help/exit-confirm.png",
    imageWidth: 2322,
    imageHeight: 1754,
    tone: "bg-zinc-100 text-ink",
    hideBottomShadow: true,
  },
  {
    eyebrow: "Dashboard",
    title: "완료 후 누적 분석 확인",
    body: "완료한 회차의 점수 추이와 유형별 누적 점수를 전체, 캠퍼스, 분반 평균과 비교합니다.",
    image: "/help/dashboard.png",
    imageWidth: 1297,
    imageHeight: 886,
    tone: "bg-amber-50 text-amber-700",
    hideBottomShadow: true,
  },
  {
    eyebrow: "Result",
    title: "전체 시험자 점수 분포 확인",
    body: "응시 완료 후 내 점수대, 전체 평균, 최고점을 한 화면에서 확인해 현재 위치를 빠르게 파악할 수 있습니다.",
    image: "/help/result-distribution.png",
    imageWidth: 1304,
    imageHeight: 833,
    tone: "bg-red-50 text-brand",
  },
  {
    eyebrow: "Compare",
    title: "과목별 점수와 랭킹 비교",
    body: "과목별 점수, 평균 대비 차이, 랭킹을 함께 보며 강점과 약한 유형을 구분합니다.",
    image: "/help/result-detail.png",
    imageWidth: 2556,
    imageHeight: 1406,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    eyebrow: "Weak Points",
    title: "유형별 고오답률 문항 분석",
    body: "내 응시를 포함한 전체 응시자 기준으로 많이 틀린 문항을 모아, 복습 우선순위를 정할 수 있습니다.",
    image: "/help/hard-questions.png",
    imageWidth: 2588,
    imageHeight: 990,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    eyebrow: "Review",
    title: "문항별 리뷰와 해설 확인",
    body: "문제 원문, 자료, 보기, 정답, 내 답, 해설을 한 번에 확인하며 틀린 문제와 맞춘 문제를 필터링할 수 있습니다.",
    image: "/help/review.png",
    imageWidth: 2062,
    imageHeight: 1594,
    tone: "bg-zinc-100 text-ink",
  },
];

function LandingPage() {
  return (
    <div className="relative left-1/2 -ml-[50vw] -my-10 min-h-screen w-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-hairline bg-white/95 backdrop-blur">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-6">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="text-xl font-black tracking-tight text-brand">
              SKCT
            </span>
            <span className="text-sm font-semibold text-ink-2">모의고사</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-600"
            >
              로그인
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl content-center gap-10 px-6 py-12">
        <div className="relative overflow-hidden rounded-2xl border border-hairline bg-zinc-950 shadow-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-55"
            style={{ backgroundImage: "url('/help/dashboard.png')" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/58 to-black/16" />
          <div className="relative flex min-h-[520px] max-w-4xl flex-col justify-center px-10 py-16 text-white [word-break:keep-all]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-200">
              SKALA SKCT Practice
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-tight">
              SKCT 모의고사
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/82">
              SKALA 내에서 SKCT 모의고사를 응시하고,
              <br />
              결과를 전체, 캠퍼스, 분반 평균과 비교해 취약 유형과 문항을 복습하는 분석 서비스입니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["12회차 모의고사", "5개 유형 분석", "문항별 리뷰"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/88"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-9 flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-brand px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-red-600"
              >
                로그인하고 시작
              </Link>
            </div>
          </div>
        </div>

        <section className="grid gap-10 pt-4">
          <div className="max-w-4xl border-l-4 border-brand pl-5 [word-break:keep-all]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">
              Service Guide
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-ink">
              응시부터 복습까지, 전체 이용 흐름
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-3">
              SKCT 모의고사는 단순히 문제를 푸는 화면에서 끝나지 않습니다.
              <br />
              응시 전 구성 확인, 유형별 풀이, 제출, 결과 비교, 고오답률 문항 분석, 문항별 리뷰까지 한 번의 학습 흐름으로 이어집니다.
            </p>
          </div>
          <div className="grid gap-0">
            {landingGuideSections.map((item, index) => {
              const reversed = index % 2 === 1;
              return (
                <article
                  key={item.title}
                  className={`grid items-center gap-8 py-12 ${
                    reversed
                      ? "lg:grid-cols-[minmax(0,1fr)_420px]"
                      : "lg:grid-cols-[420px_minmax(0,1fr)]"
                  }`}
                >
                  <div className={reversed ? "lg:order-2" : ""}>
                    <div className="[word-break:keep-all]">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand">
                        {item.eyebrow}
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-ink">
                        {item.title}
                      </h3>
                      <p className="mt-4 text-base leading-8 text-ink-3 [overflow-wrap:normal]">
                        {item.body}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`rounded-2xl border border-red-100 bg-white p-5 shadow-[0_24px_70px_rgba(20,20,20,0.08)] ${
                      reversed ? "lg:order-1" : ""
                    }`}
                  >
                    <div className="relative overflow-hidden rounded-xl">
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={item.imageWidth}
                        height={item.imageHeight}
                        sizes="(min-width: 1280px) 820px, 100vw"
                        className="h-auto w-full"
                      />
                      {item.hideBottomShadow && (
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-[9%] bg-gradient-to-t from-white via-white/95 to-transparent"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) return <LandingPage />;

  // 서로 의존이 없는 쿼리는 병렬 실행(순차 왕복 2회 → 1회).
  const [examList, examSubjectTotals] = await Promise.all([
    getPublishedExams(),
    getExamSubjectTotals(),
  ]);

  const publishedExamIds = examList.map((exam) => exam.id);

  // 통계는 유저·시험별 첫 '완료' 응시 1개만 사용해 재응시 점수가 대시보드에 섞이지 않게 한다.
  const finishedRows = publishedExamIds.length
    ? await db
        .select({
          id: attempts.id,
          userId: attempts.userId,
          examId: attempts.examId,
          finishedAt: attempts.finishedAt,
        })
        .from(attempts)
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
    <div className="grid gap-4 xl:h-[min(720px,calc(100vh-8rem))] xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-stretch">
      {/* ── 중앙: 분석 대시보드 */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 xl:h-full xl:min-h-0">
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
          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
            <div className="chart-card flex min-h-0 flex-col p-3.5">
              <TrendChart
                data={trendData}
                className="min-h-0 flex-1"
                title="회차별 점수 추이"
                description="완료한 모의고사의 1회차 기준, 100점 만점"
              />
            </div>
            <div className="chart-card flex min-h-0 flex-col p-3.5">
              <SubjectRadar
                data={radarData}
                className="min-h-0 flex-1"
                title="유형별 점수"
                description="전체 모의고사의 1회차 점수 누적, 100점 만점"
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
                        className="rounded-lg border border-hairline px-2.5 py-1.5 text-[11px] font-semibold text-ink-2 transition hover:bg-page"
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
  );
}
