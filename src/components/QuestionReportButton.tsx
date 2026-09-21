"use client";

import { useState, useTransition } from "react";
import { submitQuestionReport } from "@/lib/actions/reports";

const REASONS = ["문제 내용 오류", "정답 오류", "해설 오류", "이미지·표시 오류", "기타"];

export default function QuestionReportButton({ examId, questionId, placement = "inline" }: { examId: number; questionId: number; placement?: "inline" | "floating" }) {
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => startTransition(async () => {
    const result = await submitQuestionReport({ examId, questionId, reasons, detail });
    if (!result.ok) return setMessage(result.error ?? "신고를 접수하지 못했습니다.");
    setMessage(""); setOpen(false); setReasons([]); setDetail("");
  });

  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={placement === "floating"
        ? "absolute right-[calc(100%+12px)] top-0 z-10 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-500 shadow-sm transition hover:border-red-200 hover:text-red-600 max-[1320px]:static max-[1320px]:mb-2"
        : "rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-500 transition hover:border-red-200 hover:text-red-600"}
    >
      ⚑ 신고
    </button>
    {open && <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 px-4" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby={`report-title-${questionId}`} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id={`report-title-${questionId}`} className="text-lg font-black text-zinc-900">문항 신고</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">해당하는 항목을 모두 선택해주세요.</p>
        <div className="mt-4 grid gap-2">
          {REASONS.map((reason) => <label key={reason} className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm">
            <input type="checkbox" checked={reasons.includes(reason)} onChange={(event) => setReasons((current) => event.target.checked ? [...current, reason] : current.filter((item) => item !== reason))} className="accent-red-600" />{reason}
          </label>)}
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-bold text-zinc-800">상세 내용 직접 입력</span>
          <span className="ml-2 text-xs font-medium text-zinc-400">선택</span>
          <textarea value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={1000} placeholder="오류가 있는 부분이나 수정이 필요한 내용을 직접 적어주세요." className="mt-2 min-h-28 w-full resize-y rounded-xl border border-zinc-200 px-3 py-3 text-sm leading-6 outline-none focus:border-zinc-400" />
          <span className="mt-1 block text-right text-[11px] tabular-nums text-zinc-400">{detail.length}/1000</span>
        </label>
        {message && <p className="mt-2 text-xs font-semibold text-red-600">{message}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600">취소</button><button type="button" disabled={pending} onClick={submit} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "접수 중..." : "신고 접수"}</button></div>
      </div>
    </div>}
  </>;
}
