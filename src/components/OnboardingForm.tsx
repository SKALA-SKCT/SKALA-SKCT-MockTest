"use client";

import { useState } from "react";
import { saveOnboarding } from "@/lib/actions/auth";

const maxClassForCampus = (campus: string) => (campus === "판교" ? 10 : 4);

export default function OnboardingForm({
  campuses,
}: {
  campuses: readonly string[];
}) {
  const [campus, setCampus] = useState(campuses[0]);
  const [classNumber, setClassNumber] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await saveOnboarding({ campus, classNumber });
    if (result.ok) {
      window.location.href = "/";
      return;
    }
    setError(result.error ?? "저장에 실패했습니다.");
    setBusy(false);
  };

  return (
    <div className="mx-auto mt-16 w-full max-w-[420px] rounded-2xl border border-hairline bg-surface p-7 shadow-sm">
      <h1 className="text-2xl font-black text-ink">캠퍼스·분반 설정</h1>
      <p className="mt-2 text-sm leading-6 text-ink-2">
        평균 비교 분석을 위해 캠퍼스와 분반을 선택해주세요. 나중에 내 정보에서 변경할 수 있습니다.
      </p>

      <div className="mt-6 grid grid-cols-[1fr_112px] gap-2">
        <label className="block">
          <span className="text-xs font-semibold text-ink-2">캠퍼스</span>
          <select
            value={campus}
            onChange={(e) => {
              setCampus(e.target.value);
              setClassNumber(1);
            }}
            disabled={busy}
            className="select-control mt-2 w-full rounded-lg border border-zinc-300 py-3 pl-4 text-sm outline-none focus:border-red-500 disabled:bg-zinc-50"
          >
            {campuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink-2">분반</span>
          <select
            value={classNumber}
            onChange={(e) => setClassNumber(Number(e.target.value))}
            disabled={busy}
            className="select-control mt-2 w-full rounded-lg border border-zinc-300 py-3 pl-3 text-sm outline-none focus:border-red-500 disabled:bg-zinc-50"
          >
            {Array.from({ length: maxClassForCampus(campus) }, (_, i) => i + 1).map((option) => (
              <option key={option} value={option}>
                {option}반
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {busy ? "저장 중..." : "시작하기"}
      </button>
    </div>
  );
}
