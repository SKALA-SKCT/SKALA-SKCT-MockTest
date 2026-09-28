"use client";

import { useMemo, useState } from "react";
import ScoreDistributionChart, {
  type ScoreDistributionDatum,
} from "@/components/ScoreDistributionChart";
import TrendChart, { type TrendDatum } from "@/components/TrendChart";

type DistributionBand = Omit<ScoreDistributionDatum, "includesMe">;

export type DashboardRoundScore = {
  round: number;
  title: string;
  score: number;
  rank: number;
};

export default function DashboardScoreCharts({
  trendData,
  distribution,
  average,
  attemptCount,
  myRoundScores,
}: {
  trendData: TrendDatum[];
  distribution: DistributionBand[];
  average: number;
  attemptCount: number;
  myRoundScores: DashboardRoundScore[];
}) {
  const [view, setView] = useState<"trend" | "distribution">("trend");
  const [selectedRound, setSelectedRound] = useState(
    myRoundScores.at(-1)?.round ?? 1
  );
  const selected =
    myRoundScores.find((item) => item.round === selectedRound) ??
    myRoundScores.at(-1);
  const chartData = useMemo(
    () =>
      distribution.map((band) => ({
        ...band,
        includesMe: selected
          ? selected.score >= band.min && selected.score <= band.max
          : false,
      })),
    [distribution, selected]
  );

  return (
    <div className="chart-card flex min-h-0 flex-col p-3.5">
      <div
        className="mb-3 inline-flex w-fit rounded-xl border border-hairline bg-page p-1"
        role="tablist"
        aria-label="점수 분석 기준"
      >
        {([
          ["trend", "회차별 추이"],
          ["distribution", "전체 회차 분포"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === value
                ? "bg-white text-brand shadow-sm"
                : "text-ink-3 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "trend" ? (
        <TrendChart
          data={trendData}
          className="min-h-0 flex-1"
          title="회차별 점수 추이"
          description="완료한 모의고사별 첫 응시 기록, 100점 환산"
        />
      ) : selected ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">전체 회차 통합 점수 분포</h2>
              <p className="mt-1 text-xs text-ink-3">
                1~12회차의 사용자별 첫 완료 기록 {attemptCount}건, 100점 환산
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-ink-3">
              내 점수 선택
              <select
                value={selected.round}
                onChange={(event) => setSelectedRound(Number(event.target.value))}
                className="rounded-lg border border-hairline bg-white px-3 py-1.5 font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              >
                {myRoundScores.map((item) => (
                  <option key={item.round} value={item.round}>
                    {item.round}회차 · {item.score}점
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-page px-3 py-2">
              <p className="text-[11px] text-ink-3">전체 평균</p>
              <p className="mt-0.5 text-lg font-bold text-ink">{average.toFixed(1)}점</p>
            </div>
            <div className="rounded-xl bg-page px-3 py-2">
              <p className="text-[11px] text-ink-3">내 {selected.round}회차</p>
              <p className="mt-0.5 text-lg font-bold text-brand">{selected.score}점</p>
            </div>
            <div className="rounded-xl bg-page px-3 py-2">
              <p className="text-[11px] text-ink-3">전체 기록 중</p>
              <p className="mt-0.5 text-lg font-bold text-ink">
                {selected.rank}위
                <span className="ml-1 text-xs font-medium text-ink-3">/{attemptCount}</span>
              </p>
            </div>
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-x-auto">
            <ScoreDistributionChart
              data={chartData}
              myScore={selected.score}
              average={average}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
