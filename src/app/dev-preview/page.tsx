import { notFound } from "next/navigation";
import Link from "next/link";
import AdminCharts from "@/components/AdminCharts";
import DashboardTrendChart from "@/components/DashboardTrendChart";
import SubjectRadar from "@/components/SubjectRadar";
import ScoreDistributionChart from "@/components/ScoreDistributionChart";
import { median } from "@/lib/statistics";

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ view?: string; attempt?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view = "dashboard", attempt = "1" } = await searchParams;
  const scores = [18, 31, 42, 49, 55, 61, 65, 68, 72, 75, 78, 82, 88];
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const middle = median(scores);
  const trend = [54, 62, 58, 73, 69, 82, 76, 85].map((score, index) => ({
    name: `${index + 1}세트`, 나: score,
    그룹평균: [46, 53, 51, 60, 57, 66, 64, 70][index],
    그룹중앙값: [49, 56, 54, 64, 61, 70, 68, 74][index],
  }));
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
      {view === "dashboard" && <div className="h-96"><DashboardTrendChart selectedAttempt={attempt === "all" ? "all" : Number(attempt)} series={[{ attemptRound: "all", data: trend }, { attemptRound: 1, data: trend }, { attemptRound: 2, data: trend.map((row) => ({ ...row, 나: row.나 + 3, 그룹평균: row.그룹평균 + 2, 그룹중앙값: row.그룹중앙값 + 2 })) }]} /></div>}
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
