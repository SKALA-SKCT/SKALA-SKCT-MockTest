"use client";

import { useState } from "react";

type SubjectInfo = {
  subject: string;
  total: number;
};

function TakeTransitionOverlay() {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white px-6 py-7 text-center shadow-xl">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-brand" />
        <p className="mt-4 text-base font-bold text-ink">시험을 준비중입니다.</p>
        <p className="mt-1 text-sm text-ink-3">잠시만 기다려주세요.</p>
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
  const [open, setOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const totalMinutes = subjects.length * sectionMinutes;
  const startExam = () => {
    const href = `/exam/${examId}/take`;
    setOpen(false);
    setNavigating(true);
    window.requestAnimationFrame(() => {
      window.history.pushState(null, "", href);
      window.setTimeout(() => {
        window.location.replace(href);
      }, 350);
    });
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

      {navigating && <TakeTransitionOverlay />}

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
