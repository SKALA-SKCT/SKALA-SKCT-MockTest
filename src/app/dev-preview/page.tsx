import { notFound } from "next/navigation";
import Link from "next/link";
import AdminCharts from "@/components/AdminCharts";
import DashboardTrendChart from "@/components/DashboardTrendChart";
import SubjectRadar from "@/components/SubjectRadar";
import ScoreDistributionChart from "@/components/ScoreDistributionChart";
import ResultTipsPreview from "@/components/ResultTipsPreview";
import type { ReviewQuestion } from "@/components/ResultReview";
import { median } from "@/lib/statistics";

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ view?: string; attempt?: string; points?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view = "dashboard", attempt = "1", points } = await searchParams;
  if (view === "tips") {
    const questions: ReviewQuestion[] = [
      { id: 100001, subject: "언어추리", number: 1, body: "다음 조건을 바탕으로 반드시 참인 것은?\n\nA, B, C 세 사람이 서로 다른 요일에 발표한다. A는 B보다 먼저 발표한다. C는 월요일에 발표하지 않는다.", imageUrl: null, choices: ["A는 B보다 먼저 발표한다.", "B는 월요일에 발표한다.", "C는 A보다 먼저 발표한다.", "A는 마지막에 발표한다.", "B와 C는 같은 날 발표한다."], answer: 1, explanation: "조건에서 A가 B보다 먼저 발표한다고 주어졌으므로 첫 번째 보기는 반드시 참이다.", myChoice: 3, isCorrect: false, elapsedSeconds: 74, groupAccuracy: 68, peerWrongRate: 32, choiceRates: [68, 5, 17, 6, 4] },
      { id: 100002, subject: "자료해석", number: 21, body: "매출이 200에서 250으로 증가했다. 증가율은?", imageUrl: null, choices: ["10%", "15%", "20%", "25%", "30%"], answer: 4, explanation: "증가한 값 50을 기존 값 200으로 나누면 증가율은 25%이다.", myChoice: 4, isCorrect: true, elapsedSeconds: 35, groupAccuracy: 80, peerWrongRate: 20, choiceRates: [2, 3, 10, 80, 5] },
    ];
    return <div className="space-y-5"><div><p className="text-xs font-semibold text-brand">실전 모의고사 결과</p><h1 className="mt-1 text-2xl font-bold">문항별 리뷰</h1><p className="mt-2 text-sm text-ink-2">풀이팁 UI 로컬 미리보기입니다. 실제 서버 저장과 관리자 연동은 연결 전입니다.</p></div><ResultTipsPreview questions={questions} /></div>;
  }
  const scores = [18, 31, 42, 49, 55, 61, 65, 68, 72, 75, 78, 82, 88];
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const middle = median(scores);
  const trend = [54, 62, 58, 73, 69, 82, 76, 85].map((score, index) => ({
    name: `${index + 1}세트`, 나: score,
    그룹평균: [46, 53, 51, 60, 57, 66, 64, 70][index],
    그룹중앙값: [49, 56, 54, 64, 61, 70, 68, 74][index],
  }));
  const previewTrend = trend.map((row, index) => ({ ...row, 나:
    points === "single" ? (index === 0 ? row.나 : null) :
    points === "separated" ? (index === 0 || index === 3 ? row.나 : null) : row.나 }));
  const subjects = ["언어이해", "자료해석", "창의수리", "언어추리", "수열추리"].map((subject, index) => ({
    subject, 나: [85, 70, 60, 80, 75][index],
    그룹평균: [65, 55, 50, 62, 58][index],
    그룹중앙값: [70, 60, 55, 65, 60][index],
  }));
  const distribution = Array.from({ length: 10 }, (_, index) => {
    const min = index * 10;
    const max = index === 9 ? 100 : min + 9;
    const count = scores.filter((score) => score >= min && score <= max).length;
    return { min, max, label: `${min}-${max}`, count,
      percent: Math.round(count / scores.length * 100), includesMe: 78 >= min && 78 <= max };
  });
  return (
    <div className="mx-auto max-w-[78rem] space-y-4">
      <h1 className="text-2xl font-semibold text-ink">실전 모의고사 변경 미리보기</h1>
      <p className="text-sm text-ink-3">로컬 전용 예시 데이터입니다. 수정한 실제 그래프 컴포넌트를 표시합니다.</p>
      <nav className="flex gap-3">
        {[["dashboard", "대시보드"], ["result", "결과 화면"], ["admin", "관리자 통계"]].map(([key, label]) => (
          <Link key={key} href={`/dev-preview?view=${key}`} className={`rounded-lg border px-4 py-2 text-sm ${view === key ? "bg-ink text-white" : "bg-white text-ink"}`}>{label}</Link>
        ))}
      </nav>
      <div className="grid grid-cols-3 gap-3">
        {[["내 점수", "78점"], ["전체 평균 점수", `${average.toFixed(1)}점`], ["전체 중앙값 점수", `${middle.toFixed(1)}점`]].map(([label, value]) => (
          <div key={label} className="metric-card p-4"><p className="text-xs text-ink-3">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>
        ))}
      </div>
      {view === "dashboard" && <div className="h-96 [&>div]:h-full"><DashboardTrendChart selectedAttempt={attempt === "all" ? "all" : Number(attempt)} series={[{ attemptRound: "all", data: previewTrend }, { attemptRound: 1, data: previewTrend }, { attemptRound: 2, data: trend.map((row) => ({ ...row, 나: row.나 + 3, 그룹평균: row.그룹평균 + 2, 그룹중앙값: row.그룹중앙값 + 2 })) }]} /></div>}
      {view !== "admin" && <div className="grid gap-4">
        <div className="chart-card p-5"><SubjectRadar data={subjects} title="과목별 점수 비교" className="h-80" /></div>
        <div className="chart-card overflow-x-auto p-5"><h2 className="text-sm font-semibold">전체 시험자 점수 분포</h2><ScoreDistributionChart data={distribution} myScore={78} average={average} median={middle} /></div>
      </div>}
      {view === "result" && <div className="chart-card p-5">
        <h2 className="mb-3 font-semibold">과목별 점수</h2>
        <table className="data-table text-sm"><thead><tr>{["과목", "내 점수", "전체 평균", "중앙값"].map((label) => <th key={label} className="px-4 py-3 text-right first:text-left">{label}</th>)}</tr></thead>
          <tbody>{subjects.map((row) => <tr key={row.subject}><td className="px-4 py-3">{row.subject}</td><td className="px-4 py-3 text-right">{row.나 / 5}/20</td><td className="px-4 py-3 text-right">{row.그룹평균 / 5}/20</td><td className="px-4 py-3 text-right text-[#478078]">{row.그룹중앙값 / 5}/20</td></tr>)}</tbody>
        </table>
      </div>}
      {view === "admin" && <AdminCharts examData={trend.map((row, index) => ({ name: `${index + 1}회`, 시작: 20, 완료: 13, 중도이탈: 7, 평균: row.그룹평균, 중앙값: row.그룹중앙값, 최고: 88, 최저: 18 }))} />}
    </div>
  );
}
