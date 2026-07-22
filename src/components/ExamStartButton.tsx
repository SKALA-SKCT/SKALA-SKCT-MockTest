"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type SubjectInfo = {
  subject: string;
  total: number;
};

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
  const totalMinutes = subjects.length * sectionMinutes;
  const startExam = () => {
    window.location.assign(`/exam/${examId}/take`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg bg-brand font-semibold text-white transition hover:opacity-85 disabled:opacity-50 ${
          compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-sm"
        }`}
      >
        {label}
      </button>

      {open &&
        createPortal(
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-zinc-950/45 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div>
              <div>
                <p className="text-xs font-medium text-brand">모의고사 안내</p>
                <h2 className="mt-1 text-xl font-bold text-ink">{title}</h2>
              </div>
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
        </div>,
        document.body
      )}
    </>
  );
}
