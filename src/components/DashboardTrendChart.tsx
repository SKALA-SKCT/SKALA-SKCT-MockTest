"use client";

import { useState } from "react";
import TrendChart, { type TrendDatum } from "@/components/TrendChart";

export default function DashboardTrendChart({
  series,
}: {
  series: Array<{ attemptRound: number; data: TrendDatum[] }>;
}) {
  const [attemptRound, setAttemptRound] = useState(1);
  const selected =
    series.find((item) => item.attemptRound === attemptRound) ?? series[0];

  return (
    <div className="chart-card flex min-h-0 flex-col p-3.5">
      <TrendChart
        data={selected?.data ?? []}
        className="min-h-0 flex-1"
        title="회차별 점수 추이"
        description={`사용자별 ${selected?.attemptRound ?? 1}번째 완료 기록, 100점 환산`}
        control={
          <label className="flex items-center gap-2 text-xs font-medium text-ink-3">
            응시 차수
            <span className="relative">
              <select
                value={selected?.attemptRound ?? 1}
                onChange={(event) => setAttemptRound(Number(event.target.value))}
                className="appearance-none rounded-lg border border-hairline bg-white py-1.5 pl-3 pr-9 font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              >
                {series.map((item) => (
                  <option key={item.attemptRound} value={item.attemptRound}>
                    {item.attemptRound}회차 점수
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
              >
                <path
                  d="m6 8 4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </label>
        }
      />
    </div>
  );
}
