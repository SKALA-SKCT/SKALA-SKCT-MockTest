"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SubjectInfo = {
  subject: string;
  total: number;
};

function TakeTransitionSkeleton() {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-page px-6 py-10">
      <div className="mx-auto flex max-w-5xl animate-pulse flex-col gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-1">
            {Array.from({ length: 20 }).map((_, index) => (
              <div key={index} className="h-7 w-7 rounded bg-zinc-200" />
            ))}
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-zinc-200" />
              <div className="h-8 w-24 rounded-lg bg-zinc-100" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-zinc-100" />
              <div className="h-4 w-11/12 rounded bg-zinc-100" />
              <div className="h-4 w-10/12 rounded bg-zinc-100" />
              <div className="h-4 w-4/5 rounded bg-zinc-100" />
            </div>
            <div className="mt-6 space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-12 rounded-lg bg-zinc-100" />
              ))}
            </div>
          </div>
        </div>
        <aside className="w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:w-64">
          <div className="h-4 w-40 rounded bg-zinc-200" />
          <div className="mt-4 h-10 rounded-lg bg-zinc-100" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-10 rounded bg-zinc-100" />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ExamStartButton({
  examId,
  title,
  label,
  subjects,
  sectionMinutes,
  compact = false,
}: {
  examId: number;
  title: string;
  label: string;
  subjects: SubjectInfo[];
  sectionMinutes: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const totalMinutes = subjects.length * sectionMinutes;
  const startExam = () => {
    const href = `/exam/${examId}/take`;
    setOpen(false);
    setNavigating(true);
    router.push(href);
    window.history.pushState(null, "", href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={navigating}
        className={`rounded-lg bg-brand font-semibold text-white transition hover:opacity-85 disabled:opacity-50 ${
          compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-sm"
        }`}
      >
        {label}
      </button>

      {navigating && <TakeTransitionSkeleton />}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-brand">모의고사 안내</p>
                <h2 className="mt-1 text-xl font-bold text-ink">{title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
              >
                닫기
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-200 px-4 py-3">
                <p className="text-xs text-zinc-400">유형</p>
                <p className="mt-1 text-lg font-bold">{subjects.length}개</p>
              </div>
              <div className="rounded-xl border border-zinc-200 px-4 py-3">
                <p className="text-xs text-zinc-400">총 시간</p>
                <p className="mt-1 text-lg font-bold">{totalMinutes}분</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-zinc-500">
                유형별 시간
              </p>
              <ul className="space-y-1.5 text-sm text-zinc-700">
                {subjects.map((s) => (
                  <li key={s.subject} className="flex justify-between gap-3">
                    <span>{s.subject}</span>
                    <span className="shrink-0 text-zinc-500">
                      {sectionMinutes}분 · {s.total}문항
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={startExam}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-85"
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
