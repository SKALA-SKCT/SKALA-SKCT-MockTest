"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TrendChart, { type TrendDatum } from "@/components/TrendChart";

export default function DashboardTrendChart({
  series,
  selectedAttempt,
}: {
  series: Array<{ attemptRound: number | "all"; data: TrendDatum[] }>;
  selectedAttempt: number | "all";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const selected =
    series.find((item) => item.attemptRound === selectedAttempt) ?? series[0];

  const selectAttempt = (value: string) => {
    const nextValue = value === "all" ? "all" : Number(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("attempt", String(nextValue));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="chart-card flex min-h-0 flex-col p-3.5">
      <TrendChart
        data={selected?.data ?? []}
        className="min-h-0 flex-1"
        title="회차별 점수 추이"
        description={
          selected?.attemptRound === "all"
            ? "모든 완료 기록 평균, 100점 환산"
            : `사용자별 ${selected?.attemptRound ?? 1}번째 완료 기록, 100점 환산`
        }
        control={
          <label className="flex items-center gap-2 text-xs font-medium text-ink-3">
            응시 차수
            <span className="relative">
              <select
                value={selected?.attemptRound ?? 1}
                onChange={(event) => selectAttempt(event.target.value)}
                disabled={isPending}
                className="appearance-none rounded-lg border border-hairline bg-white py-1.5 pl-3 pr-9 font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              >
                {series.map((item) => (
                  <option key={item.attemptRound} value={item.attemptRound}>
                    {item.attemptRound === "all"
                      ? "전체 회차 평균"
                      : `${item.attemptRound}회차 점수`}
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
