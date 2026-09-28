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
            <select
              value={selected?.attemptRound ?? 1}
              onChange={(event) => setAttemptRound(Number(event.target.value))}
              className="rounded-lg border border-hairline bg-white px-3 py-1.5 font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            >
              {series.map((item) => (
                <option key={item.attemptRound} value={item.attemptRound}>
                  {item.attemptRound}회차 점수
                </option>
              ))}
            </select>
          </label>
        }
      />
    </div>
  );
}
