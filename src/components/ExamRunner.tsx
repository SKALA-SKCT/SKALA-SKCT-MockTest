"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SECTION_MINUTES,
  type SectionState,
  type Subject,
} from "@/db/schema";
import { finishSection, saveAnswer, startSection } from "@/lib/actions/exam";
import Calculator from "@/components/exam/Calculator";
import MemoPad from "@/components/exam/MemoPad";
import { applyQuestionContentOverride } from "@/lib/question-overrides";
import { repairQuestionBody } from "@/lib/question-text";

export type ClientQuestion = {
  id: number;
  subject: string;
  number: number;
  body: string;
  imageUrl: string | null;
  supplementImageUrl?: string;
  choices: string[];
};

const CIRCLED = ["①", "②", "③", "④", "⑤"];

export default function ExamRunner({
  examId,
  examTitle,
  subjects,
  questionsBySubject,
  initialSectionState,
  initialAnswers,
}: {
  examId: number;
  examTitle: string;
  subjects: Subject[];
  questionsBySubject: Record<string, ClientQuestion[]>;
  initialSectionState: SectionState;
  initialAnswers: Record<number, number | null>;
}) {
  const router = useRouter();
  const [sectionState, setSectionState] = useState<SectionState>(initialSectionState);
  const [answers, setAnswers] = useState<Record<number, number | null>>(initialAnswers);
  // 과목 안에서는 자유롭게 이동 가능
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const currentSubject = subjects.find((s) => !sectionState[s]?.finishedAt);
  const section = currentSubject ? sectionState[currentSubject] : undefined;
  const sectionQuestions = useMemo(
    () => (currentSubject ? questionsBySubject[currentSubject] ?? [] : []),
    [currentSubject, questionsBySubject]
  );

  const endsAtMs = section
    ? new Date(section.startedAt).getTime() + SECTION_MINUTES * 60 * 1000
    : null;

  const [remaining, setRemaining] = useState<number | null>(null);

  const handleFinishSection = useCallback(
    async (subject: Subject) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await finishSection(examId, subject);
        setSectionState(res.sectionState);
        setIdx(0);
        if (res.finished) router.replace(`/exam/${examId}/result`);
      } finally {
        setBusy(false);
      }
    },
    [busy, examId, router]
  );

  const finishingRef = useRef(false);
  useEffect(() => {
    if (!endsAtMs || !currentSubject) return;
    finishingRef.current = false;
    const tick = () => {
      const left = Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !finishingRef.current) {
        finishingRef.current = true;
        void handleFinishSection(currentSubject);
      }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [endsAtMs, currentSubject, handleFinishSection]);

  if (!currentSubject) {
    return (
      <div className="mx-auto mt-24 max-w-md text-center">
        <p className="text-lg font-semibold">모든 과목을 완료했습니다!</p>
        <button
          onClick={() => router.replace(`/exam/${examId}/result`)}
          className="mt-4 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white"
        >
          결과 보기
        </button>
      </div>
    );
  }

  const exitExam = () => {
    if (
      confirm(
        "응시를 중단하고 나갈까요? 답안은 저장되며, 이미 시작한 과목의 타이머는 계속 진행됩니다."
      )
    )
      router.push("/");
  };

  const moveToNextSubject = () => {
    if (!currentSubject) return;
    if (
      confirm(
        `${currentSubject} 유형을 제출하고 다음 유형으로 넘어갈까요? 제출한 유형은 다시 풀 수 없습니다.`
      )
    )
      void handleFinishSection(currentSubject);
  };

  // 과목 시작 전 안내 화면
  if (!section) {
    const subjectIndex = subjects.indexOf(currentSubject);
    return (
      <div className="mx-auto mt-20 max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-medium text-zinc-400">
          {examTitle} · {subjectIndex + 1}/{subjects.length}교시
        </p>
        <h1 className="mt-2 text-3xl font-bold">{currentSubject}</h1>
        <p className="mt-3 text-sm text-zinc-500">
          {sectionQuestions.length}문항 · {SECTION_MINUTES}분
        </p>
        <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left text-xs text-zinc-400">
          <li>· 과목 안에서는 문항을 자유롭게 이동할 수 있습니다.</li>
          <li>· 메모장/그림판은 문제를 넘기면 지워집니다.</li>
          <li>· 시간이 끝나면 자동 제출됩니다.</li>
        </ul>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await startSection(examId, currentSubject);
              setSectionState(res.sectionState);
            } finally {
              setBusy(false);
            }
          }}
          className="mt-6 w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "준비 중..." : "시작하기"}
        </button>
        <button
          onClick={() => router.push("/")}
          className="mt-3 text-xs text-zinc-400 hover:text-zinc-600 hover:underline"
        >
          나가기
        </button>
      </div>
    );
  }

  const q = applyQuestionContentOverride(examId, sectionQuestions[idx]);
  const questionBody = repairQuestionBody(q.body);
  const isLast = idx === sectionQuestions.length - 1;
  const mm = remaining != null ? Math.floor(remaining / 60) : SECTION_MINUTES;
  const ss = remaining != null ? remaining % 60 : 0;
  const urgent = remaining != null && remaining < 60;

  const select = (choice: number) => {
    const next = answers[q.id] === choice ? null : choice;
    setAnswers((a) => ({ ...a, [q.id]: next }));
    void saveAnswer(examId, q.id, next).catch(() => {});
  };

  const goNext = () => {
    if (isLast) {
      if (confirm(`${currentSubject} 마지막 문제입니다. 과목을 제출할까요?`))
        void handleFinishSection(currentSubject);
      return;
    }
    setIdx((v) => v + 1);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-start">
      {/* 왼쪽: 문제 영역 */}
      <div className="min-w-0 flex-1">
        {/* 문항 번호 스트립: 과목 내 자유 이동 */}
        <div className="mb-3 flex flex-wrap gap-1">
          {sectionQuestions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setIdx(i)}
              className={`h-7 w-7 rounded text-xs font-medium transition ${
                i === idx
                  ? "bg-red-600 text-white"
                  : answers[qq.id] != null
                    ? "bg-zinc-800 text-white"
                    : "bg-white text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-100"
              }`}
            >
              {qq.number}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-sm font-bold text-red-600">
              문제 {q.number}
              <span className="ml-2 text-xs font-normal text-zinc-400">
                {idx + 1} / {sectionQuestions.length}
              </span>
            </p>
            <button
              disabled={busy}
              onClick={moveToNextSubject}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              다음 유형으로
            </button>
          </div>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-zinc-800">
            {questionBody}
          </p>
          {q.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.imageUrl}
              alt="문제 이미지"
              className="mt-3 max-w-full rounded-lg border"
            />
          )}
          {q.supplementImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.supplementImageUrl}
              alt="문제 조건"
              className="mt-3 max-w-full rounded-lg border border-zinc-200 bg-white"
            />
          )}
          <div className="mt-5 flex flex-col gap-2">
            {q.choices.map((c, i) => {
              const num = i + 1;
              const selected = answers[q.id] === num;
              return (
                <button
                  key={i}
                  onClick={() => select(num)}
                  className={`rounded-lg border px-4 py-2.5 text-left text-sm transition ${
                    selected
                      ? "border-red-500 bg-red-50 font-semibold text-red-700"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <span className="mr-2">{CIRCLED[i]}</span>
                  {c.replace(/^[①②③④⑤]\s*/, "")}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setIdx((v) => Math.max(0, v - 1))}
              disabled={idx === 0 || busy}
              className="rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              ← 이전
            </button>
            <button
              disabled={busy}
              onClick={isLast ? moveToNextSubject : goNext}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                isLast ? "bg-zinc-900 hover:bg-zinc-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {busy ? "처리 중..." : isLast ? "과목 제출" : "다음 →"}
            </button>
          </div>
        </div>
      </div>

      {/* 오른쪽: 실제 시험처럼 고정 도구 패널 */}
      <aside className="w-full shrink-0 md:sticky md:top-20 md:w-72">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
            <div>
              <p className="text-[11px] text-zinc-400">{examTitle}</p>
              <p className="text-sm font-bold">{currentSubject}</p>
            </div>
            <div
              className={`font-mono text-2xl font-bold tabular-nums ${
                urgent ? "text-red-600" : "text-zinc-800"
              }`}
            >
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <MemoPad resetKey={q.id} />
            <Calculator />
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={busy}
                onClick={exitExam}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                나가기
              </button>
              <button
                disabled={busy}
                onClick={moveToNextSubject}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                다음 유형
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
