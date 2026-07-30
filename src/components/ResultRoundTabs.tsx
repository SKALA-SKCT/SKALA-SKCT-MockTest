"use client";

import { type ReactNode, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function ResultPageSkeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="metric-card h-[116px] p-5">
            <div className="mx-auto h-3 w-20 rounded-full bg-zinc-100" />
            <div className="mx-auto mt-5 h-8 w-24 rounded-full bg-zinc-100" />
          </div>
        ))}
      </div>

      <div className="chart-card space-y-4 p-5">
        <div className="h-5 w-36 rounded-full bg-zinc-100" />
        <div className="h-[88px] rounded-xl bg-zinc-100" />
        <div className="h-[108px] rounded-xl bg-zinc-100" />
        <div className="h-[108px] rounded-xl bg-zinc-100" />
      </div>

      <div className="chart-card p-5">
        <div className="h-5 w-44 rounded-full bg-zinc-100" />
        <div className="mt-5 h-[260px] rounded-xl bg-zinc-100" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="chart-card h-[380px] p-5">
          <div className="h-5 w-36 rounded-full bg-zinc-100" />
          <div className="mt-6 h-[300px] rounded-xl bg-zinc-100" />
        </div>
        <div className="space-y-4">
          <div className="chart-card h-[220px] p-5">
            <div className="h-5 w-28 rounded-full bg-zinc-100" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-8 rounded-lg bg-zinc-100" />
              ))}
            </div>
          </div>
          <div className="chart-card h-[220px] p-5">
            <div className="h-5 w-20 rounded-full bg-zinc-100" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-8 rounded-lg bg-zinc-100" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card h-[520px] p-5">
        <div className="h-5 w-32 rounded-full bg-zinc-100" />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-32 rounded-xl bg-zinc-100" />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 rounded-xl bg-zinc-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResultRoundTabs({
  examId,
  rounds,
  selectedRound,
  children,
}: {
  examId: number;
  rounds: Array<{ id: number; round: number }>;
  selectedRound: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [optimisticRound, setOptimisticRound] = useState(selectedRound);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOptimisticRound(selectedRound);
  }, [selectedRound]);

  return (
    <div>
      <div className="mt-4 flex flex-wrap gap-2">
        {rounds.map((attempt) => {
          const active = attempt.round === optimisticRound;
          return (
            <button
              key={attempt.id}
              type="button"
              onClick={() => {
                setOptimisticRound(attempt.round);
                startTransition(() => {
                  router.push(`/exam/${examId}/result?round=${attempt.round}`);
                });
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-hairline bg-white text-ink-2 hover:bg-page"
              }`}
            >
              {attempt.round}회차
            </button>
          );
        })}
      </div>
      {isPending ? <ResultPageSkeleton /> : children}
    </div>
  );
}
