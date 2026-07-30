"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ResultRoundTabs({
  examId,
  rounds,
  selectedRound,
}: {
  examId: number;
  rounds: Array<{ id: number; round: number }>;
  selectedRound: number;
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
      {isPending && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="h-3 rounded-full bg-zinc-100" />
          <div className="h-3 rounded-full bg-zinc-100" />
          <div className="h-3 rounded-full bg-zinc-100" />
        </div>
      )}
    </div>
  );
}
