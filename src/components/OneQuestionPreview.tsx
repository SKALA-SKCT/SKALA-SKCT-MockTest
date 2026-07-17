"use client";

import { useMemo, useState } from "react";

type PreviewQuestion = {
  number: number;
  round: number;
  subject: string;
  body: string;
  choices: string[];
  answer: number;
  explanation: string;
  imageUrl: string | null;
};

const CIRCLED = ["①", "②", "③", "④", "⑤"];

export default function OneQuestionPreview({
  question,
}: {
  question: PreviewQuestion;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    if (!submitted || selected == null) return null;
    return selected === question.answer ? "correct" : "wrong";
  }, [question.answer, selected, submitted]);

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0 overflow-hidden rounded-lg border border-hairline bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-brand">{question.subject}</p>
            <h1 className="mt-1 text-lg font-bold text-ink">
              {question.round}회차 프리뷰 · {question.number}번
            </h1>
          </div>
          <div className="rounded-md border border-hairline bg-page px-3 py-1.5 font-mono text-sm font-bold text-ink-2">
            14:58
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <div className="mb-5 rounded-md bg-page px-4 py-3">
            <p className="whitespace-pre-line text-[15px] leading-7 text-ink">
              {question.body}
            </p>
            {question.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={question.imageUrl}
                alt={`${question.round}회차 ${question.number}번 원본 자료`}
                className="mt-4 w-full rounded-md border border-hairline bg-white"
              />
            )}
          </div>

          <div className="space-y-2.5">
            {question.choices.map((choice, index) => {
              const value = index + 1;
              const isSelected = selected === value;
              const isAnswer = submitted && question.answer === value;
              const isWrong = submitted && isSelected && value !== question.answer;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (!submitted) setSelected(value);
                  }}
                  className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-sm leading-6 transition ${
                    isAnswer
                      ? "border-[#0ca30c] bg-[#0ca30c]/8 text-ink"
                      : isWrong
                        ? "border-brand bg-brand/8 text-ink"
                        : isSelected
                          ? "border-brand bg-brand/5 text-ink"
                          : "border-hairline bg-white text-ink-2 hover:border-ink-3"
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 text-base font-bold ${
                      isAnswer
                        ? "text-[#006300]"
                        : isWrong || isSelected
                          ? "text-brand"
                          : "text-ink-3"
                    }`}
                  >
                    {CIRCLED[index]}
                  </span>
                  <span className="whitespace-pre-line">{choice}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setSubmitted(false);
              }}
              className="rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-page"
            >
              다시 선택
            </button>
            <button
              type="button"
              disabled={selected == null}
              onClick={() => setSubmitted(true)}
              className="rounded-md bg-brand px-5 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              채점하기
            </button>
          </div>

          {submitted && (
            <div
              className={`mt-5 rounded-md border px-4 py-3 ${
                result === "correct"
                  ? "border-[#0ca30c]/30 bg-[#0ca30c]/8"
                  : "border-brand/30 bg-brand/8"
              }`}
            >
              <p className="text-sm font-bold text-ink">
                {result === "correct" ? "정답입니다." : "오답입니다."} 정답은{" "}
                {CIRCLED[question.answer - 1]}번입니다.
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-2">
                {question.explanation}
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="lg:sticky lg:top-24">
        <div className="rounded-lg border border-hairline bg-surface p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-3">현재 유형</p>
              <p className="text-sm font-bold text-ink">{question.subject}</p>
            </div>
            <span className="rounded-md bg-page px-2.5 py-1 text-xs font-semibold text-ink-2">
              {question.number} / 100
            </span>
          </div>

          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 100 }, (_, index) => {
              const no = index + 1;
              return (
                <button
                  key={no}
                  type="button"
                  className={`aspect-square rounded text-[10px] font-bold ${
                    no === question.number
                      ? "bg-brand text-white"
                      : selected != null && no === question.number
                        ? "bg-ink text-white"
                        : "bg-page text-ink-3"
                  }`}
                >
                  {no}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-md bg-page p-3 text-xs leading-5 text-ink-3">
            <div className="flex justify-between">
              <span>선택한 답</span>
              <b className="text-ink">
                {selected == null ? "-" : CIRCLED[selected - 1]}
              </b>
            </div>
            <div className="mt-1 flex justify-between">
              <span>상태</span>
              <b className="text-ink">{submitted ? "채점 완료" : "풀이 중"}</b>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
