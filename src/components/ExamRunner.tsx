"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SECTION_MINUTES,
  type SectionState,
  type Subject,
} from "@/db/schema";
import {
  abandonAttempt,
  finishSection,
  saveAnswer,
  startQuestion,
  startSection,
} from "@/lib/actions/exam";
import Calculator from "@/components/exam/Calculator";
import MemoPad from "@/components/exam/MemoPad";
import { applyQuestionContentOverride } from "@/lib/question-overrides";
import {
  normalizeChoiceTexts,
  normalizeQuestionDisplayText,
  repairQuestionBody,
} from "@/lib/question-text";

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

function splitQuestionBodyText(value: string) {
  const [firstBlock, ...restBlocks] = value.split(/\n{2,}/);
  if (firstBlock?.trim().endsWith("?") && restBlocks.length > 0) {
    return {
      prompt: firstBlock.trim(),
      passage: restBlocks.join("\n\n").trim(),
    };
  }

  const questionEnd = value.indexOf("?");
  if (questionEnd < 0) return { prompt: value, passage: "" };

  const prompt = value.slice(0, questionEnd + 1).trim();
  const passage = value.slice(questionEnd + 1).trim();
  if (prompt.length > 220 && passage) {
    return { prompt: value, passage: "" };
  }

  return { prompt, passage };
}

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
  const [confirmRequest, setConfirmRequest] = useState<{
    title: string;
    message: string;
    confirmText: string;
    tone?: "danger" | "default";
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const pendingSavesRef = useRef<Set<Promise<unknown>>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const restoredSubjectRef = useRef<string | null>(null);
  const shouldCleanupOnUnloadRef = useRef(true);

  const currentSubject = subjects.find((s) => !sectionState[s]?.finishedAt);
  const section = currentSubject ? sectionState[currentSubject] : undefined;
  const sectionQuestions = useMemo(
    () => (currentSubject ? questionsBySubject[currentSubject] ?? [] : []),
    [currentSubject, questionsBySubject]
  );

  const endsAtMs = section
    ? new Date(section.startedAt).getTime() + SECTION_MINUTES * 60 * 1000
    : null;
  const sectionStartedAt = section?.startedAt;

  const [remaining, setRemaining] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!sectionStartedAt) return;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const resetScroll = () => window.scrollTo({ top: 0, behavior: "auto" });
    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    const timeout = window.setTimeout(resetScroll, 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.history.scrollRestoration = previousRestoration;
    };
  }, [idx, sectionStartedAt]);

  useEffect(() => {
    if (!sectionStartedAt || !currentSubject || sectionQuestions.length === 0) return;
    if (restoredSubjectRef.current === currentSubject) return;
    const requestedParam = new URLSearchParams(window.location.search).get("q");
    const timeout = window.setTimeout(() => {
      const requested = Number(requestedParam);
      if (Number.isInteger(requested)) {
        setIdx(Math.min(sectionQuestions.length - 1, Math.max(0, requested - 1)));
      }
      restoredSubjectRef.current = currentSubject;
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [currentSubject, sectionQuestions.length, sectionStartedAt]);

  useEffect(() => {
    if (!sectionStartedAt || restoredSubjectRef.current !== currentSubject) return;
    const url = new URL(window.location.href);
    url.searchParams.set("q", String(idx + 1));
    window.history.replaceState(null, "", url);
  }, [currentSubject, idx, sectionStartedAt]);

  const handleFinishSection = useCallback(
    async (subject: Subject) => {
      if (busy) return;
      setBusy(true);
      try {
        await Promise.allSettled([...pendingSavesRef.current]);
        const res = await finishSection(examId, subject);
        setSectionState(res.sectionState);
        setIdx(0);
        restoredSubjectRef.current = null;
        if (res.finished) {
          shouldCleanupOnUnloadRef.current = false;
          router.replace(`/exam/${examId}/result`);
        } else if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("q", "1");
          window.history.replaceState(null, "", url);
        }
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

  useEffect(() => {
    const cleanupAttempt = () => {
      if (!shouldCleanupOnUnloadRef.current) return;
      const url = `/api/exam/${examId}/abandon`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([], { type: "application/octet-stream" }));
        return;
      }
      void fetch(url, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("pagehide", cleanupAttempt);
    window.addEventListener("beforeunload", cleanupAttempt);
    return () => {
      window.removeEventListener("pagehide", cleanupAttempt);
      window.removeEventListener("beforeunload", cleanupAttempt);
    };
  }, [examId]);

  const activeQuestionId = section ? sectionQuestions[idx]?.id ?? null : null;
  useEffect(() => {
    if (!activeQuestionId) return;
    void startQuestion(examId, activeQuestionId);
  }, [activeQuestionId, examId]);

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
    setConfirmRequest({
      title: "응시를 중단할까요?",
      message:
        "지금 나가면 이번 응시 기록과 저장된 답안이 모두 초기화됩니다.",
      confirmText: "나가기",
      tone: "danger",
      onConfirm: async () => {
        await Promise.allSettled([...pendingSavesRef.current]);
        await abandonAttempt(examId);
        shouldCleanupOnUnloadRef.current = false;
        router.replace("/");
      },
    });
  };

  const moveToNextSubject = () => {
    if (!currentSubject) return;
    const unansweredCount = sectionQuestions.filter(
      (qq) => answers[qq.id] == null
    ).length;
    setConfirmRequest({
      title: "유형을 제출할까요?",
      message:
        unansweredCount > 0
          ? `${currentSubject} 유형에 미응답 ${unansweredCount}문항이 있습니다. 제출하면 이 유형은 다시 풀 수 없습니다.`
          : `${currentSubject} 유형을 제출하면 이 유형은 다시 풀 수 없습니다.`,
      confirmText: "제출하기",
      onConfirm: () => handleFinishSection(currentSubject),
    });
  };

  const confirmModal = confirmRequest ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <p className="text-lg font-bold text-zinc-900">{confirmRequest.title}</p>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          {confirmRequest.message}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmRequest(null)}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const action = confirmRequest.onConfirm;
              setConfirmRequest(null);
              await action();
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              confirmRequest.tone === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-zinc-900 hover:bg-zinc-700"
            }`}
          >
            {confirmRequest.confirmText}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // 과목 시작 전 안내 화면
  if (!section) {
    const subjectIndex = subjects.indexOf(currentSubject);
    return (
      <>
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
                setIdx(0);
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
            disabled={busy}
            onClick={exitExam}
            className="mt-3 text-xs text-zinc-400 hover:text-zinc-600 hover:underline disabled:opacity-50"
          >
            나가기
          </button>
        </div>
        {confirmModal}
      </>
    );
  }

  const q = applyQuestionContentOverride(examId, sectionQuestions[idx]);
  const questionBody = normalizeQuestionDisplayText(
    repairQuestionBody(q.body, {
      hasMaterialImage: Boolean(q.imageUrl || q.supplementImageUrl),
      subject: q.subject,
    })
  );
  const { prompt: questionPrompt, passage: questionPassage } =
    splitQuestionBodyText(questionBody);
  const displayChoices = normalizeChoiceTexts(q.choices);
  const supplementImageUrl =
    q.supplementImageUrl && q.supplementImageUrl !== q.imageUrl
      ? q.supplementImageUrl
      : null;
  const isLast = idx === sectionQuestions.length - 1;
  const mm = remaining != null ? Math.floor(remaining / 60) : SECTION_MINUTES;
  const ss = remaining != null ? remaining % 60 : 0;
  const urgent = remaining != null && remaining < 60;

  const select = (choice: number) => {
    const next = choice;
    setNotice(null);
    setAnswers((a) => ({ ...a, [q.id]: next }));
    const pendingSave = saveAnswer(examId, q.id, next).catch(() => {});
    pendingSavesRef.current.add(pendingSave);
    void pendingSave.finally(() => {
      pendingSavesRef.current.delete(pendingSave);
    });
  };

  const goNext = () => {
    if (isLast) {
      moveToNextSubject();
      return;
    }
    setIdx((v) => v + 1);
  };

  return (
    <>
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
                {i + 1}
              </button>
            ))}
          </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-sm font-bold text-red-600">
              문제 {idx + 1}{" "}
              <span className="text-xs font-normal text-zinc-400">
                / {sectionQuestions.length}
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
          {notice && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
              {notice}
            </div>
          )}
          <div className="rounded-xl bg-zinc-50 px-4 py-4">
            <p className="whitespace-pre-line text-[15px] font-bold leading-7 text-zinc-900 [overflow-wrap:anywhere]">
              {questionPrompt}
            </p>
            {questionPassage && (
              <div className="mt-3 border-t border-zinc-200 pt-3">
                <p className="whitespace-pre-line text-sm leading-7 text-zinc-700 [overflow-wrap:anywhere]">
                  {questionPassage}
                </p>
              </div>
            )}
          </div>
          {q.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.imageUrl}
              alt="문제 이미지"
              className="mt-3 max-w-full rounded-lg border"
            />
          )}
          {supplementImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={supplementImageUrl}
              alt="문제 조건"
              className="mt-3 max-w-full rounded-lg border border-zinc-200 bg-white"
            />
          )}
          <div className="mt-5 flex flex-col gap-2">
            {displayChoices.map((c, i) => {
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

      {confirmModal}
    </>
  );
}
