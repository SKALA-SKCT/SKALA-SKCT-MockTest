"use client";

import { useMemo, useState } from "react";
import ResultReviewChatbot from "@/components/ResultReviewChatbot";
import { applyQuestionContentOverride } from "@/lib/question-overrides";
import {
  formatReviewExplanation,
  normalizeChoiceTexts,
  normalizeQuestionDisplayText,
  normalizeReviewText,
  repairQuestionBody,
} from "@/lib/question-text";

const CIRCLED = ["①", "②", "③", "④", "⑤"];
type ReviewFilter =
  | "all"
  | "wrong"
  | "correct"
  | "easy-mistake"
  | "unanswered";

export type ReviewQuestion = {
  id: number;
  subject: string;
  number: number;
  body: string;
  imageUrl: string | null;
  supplementImageUrl?: string;
  choices: string[];
  answer: number;
  explanation: string | null;
  myChoice: number | null;
  isCorrect: boolean;
  elapsedSeconds: number | null;
  groupAccuracy: number;
  peerWrongRate: number | null;
  choiceRates: number[] | null;
};

type SubjectSummary = {
  subject: string;
  mine: number;
  total: number;
  elapsedSeconds: number;
  hardQuestions: ReviewQuestion[];
};

type HardQuestionPreview = {
  id: number;
  number: number;
  subject: string;
  wrongRate: number;
  note: string;
  elapsedSeconds: number | null;
  isSample: boolean;
};

function ResultPill({ question }: { question: ReviewQuestion }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-semibold ${
        question.isCorrect
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-600"
      }`}
    >
      {question.isCorrect ? "정답" : question.myChoice == null ? "무응답" : "오답"}
    </span>
  );
}

function formatElapsedSeconds(value: number | null) {
  if (value == null) return "풀이 0초";
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `풀이 ${minutes > 0 ? `${minutes}분 ` : ""}${String(seconds).padStart(2, "0")}초`;
}

function formatSubjectElapsedSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `풀이 ${minutes}분 ${String(seconds).padStart(2, "0")}초`;
}

function WrongRate({ value }: { value: number | null }) {
  return (
    <span className={value != null && value >= 50 ? "text-red-500" : "text-zinc-400"}>
      응시자 오답률 {value == null ? "-" : `${value}%`}
    </span>
  );
}

function splitQuestionBody(question: ReviewQuestion & { supplementImageUrl?: string }) {
  const normalized = normalizeQuestionDisplayText(
    repairQuestionBody(question.body, {
      hasMaterialImage: Boolean(question.imageUrl || question.supplementImageUrl),
      subject: question.subject,
    })
  );

  const [firstBlock, ...restBlocks] = normalized.split(/\n{2,}/);
  if (firstBlock?.trim().endsWith("?") && restBlocks.length > 0) {
    return {
      prompt: firstBlock.trim(),
      passage: restBlocks.join("\n\n").trim(),
    };
  }

  const questionEnd = normalized.indexOf("?");
  if (questionEnd < 0) {
    return { prompt: normalized, passage: "" };
  }

  const prompt = normalized.slice(0, questionEnd + 1).trim();
  const passage = normalized.slice(questionEnd + 1).trim();
  if (prompt.length > 220 && passage) {
    return { prompt: normalized, passage: "" };
  }

  return {
    prompt,
    passage,
  };
}

function QuestionCard({
  question,
  examId,
}: {
  question: ReviewQuestion;
  examId: number;
}) {
  const choiceRates = question.choiceRates;
  const displayQuestion = applyQuestionContentOverride(examId, question);
  const { prompt, passage } = splitQuestionBody(displayQuestion);
  const displayChoices = normalizeChoiceTexts(displayQuestion.choices);
  const supplementImageUrl =
    displayQuestion.supplementImageUrl &&
    displayQuestion.supplementImageUrl !== displayQuestion.imageUrl
      ? displayQuestion.supplementImageUrl
      : null;
  const explanation = formatReviewExplanation(
    displayQuestion.explanation,
    displayQuestion.answer,
    displayChoices[displayQuestion.answer - 1]
  );
  const reviewExplanation = sanitizeExplanationForReview(
    explanation,
    displayQuestion.subject,
    displayQuestion.answer,
    displayChoices[displayQuestion.answer - 1]
  );

  return (
    <div id={`review-question-${question.id}`} className="scroll-mt-24 px-5 py-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <ResultPill question={question} />
        <span className="font-medium text-zinc-500">문제 {question.number}</span>
        <span className="font-semibold text-zinc-500">
          {formatElapsedSeconds(question.elapsedSeconds)}
        </span>
        <span className="ml-auto font-medium">
          <WrongRate value={question.peerWrongRate} />
        </span>
      </div>

      <div className="rounded-xl bg-zinc-50 px-4 py-4">
        <p className="whitespace-pre-line text-[15px] font-bold leading-7 text-zinc-900 [overflow-wrap:anywhere]">
          {prompt}
        </p>
        {passage && (
          <div className="mt-3 border-t border-zinc-200 pt-3">
            <p className="whitespace-pre-line text-sm leading-7 text-zinc-700 [overflow-wrap:anywhere]">
              {passage}
            </p>
          </div>
        )}
        {displayQuestion.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayQuestion.imageUrl}
            alt={`${displayQuestion.number}번 자료`}
            className="-mx-3 mt-4 h-auto w-[calc(100%+1.5rem)] max-w-none rounded-lg border border-zinc-200 bg-white object-contain"
          />
        )}
        {supplementImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={supplementImageUrl}
            alt={`${displayQuestion.number}번 조건`}
            className="-mx-3 mt-4 h-auto w-[calc(100%+1.5rem)] max-w-none rounded-lg border border-zinc-200 bg-white object-contain"
          />
        )}
      </div>

      <div className="mt-3 grid gap-2">
        {displayChoices.map((choice, index) => {
          const value = index + 1;
          const isAnswer = value === question.answer;
          const isMine = value === question.myChoice;
          return (
            <div
              key={value}
              className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-lg border px-3 py-2.5 text-sm leading-6 ${
                isAnswer
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : isMine
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-zinc-100 bg-white text-zinc-600"
              }`}
            >
              <span className="shrink-0 font-bold">{CIRCLED[index]}</span>
              <span className="min-w-0 whitespace-pre-line [overflow-wrap:anywhere]">
                {normalizeReviewText(choice)}
              </span>
              <span className="col-start-2 flex flex-wrap items-center gap-2 text-xs">
                {choiceRates && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-500">
                    선택 {choiceRates[index] ?? 0}점
                  </span>
                )}
                {isAnswer && (
                  <span className="font-bold text-emerald-700">정답</span>
                )}
                {!isAnswer && isMine && (
                  <span className="font-bold text-red-600">내 답</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-sm font-medium text-zinc-600">
        내 답: {question.myChoice ? CIRCLED[question.myChoice - 1] : "-"} · 정답:{" "}
        <b className="text-base text-zinc-800">{CIRCLED[question.answer - 1]}</b>
      </p>

      {reviewExplanation && (
        <div className="mt-3 rounded-lg bg-zinc-50 px-4 py-3">
          <p className="text-sm font-bold text-zinc-700">해설</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-600 [overflow-wrap:anywhere]">
            {reviewExplanation}
          </p>
        </div>
      )}
    </div>
  );
}

function sanitizeExplanationForReview(
  explanation: string,
  subject: string,
  answer: number,
  answerChoice?: string
) {
  if (!explanation) return "";
  const circled = CIRCLED[answer - 1] ?? `${answer}번`;
  const choice = normalizeReviewText(answerChoice).replace(/\s+/g, " ").trim();
  const answerSentence = choice
    ? `정답은 ${circled} '${choice}'이다.`
    : `정답은 ${circled}이다.`;

  if (subject === "수열추리") {
    return choice
      ? `수열의 규칙을 적용하면 빈칸에 들어갈 값은 ${choice}이다.\n${answerSentence}`
      : answerSentence;
  }

  if (subject === "창의수리") {
    return choice
      ? `조건을 식으로 정리하면 계산 결과는 ${choice}이다.\n${answerSentence}`
      : answerSentence;
  }

  return explanation;
}

export default function ResultReview({
  examId,
  questions,
  subjects,
  participantCount,
}: {
  examId: number;
  questions: ReviewQuestion[];
  subjects: SubjectSummary[];
  participantCount: number;
}) {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});

  const visibleBySubject = useMemo(
    () =>
      subjects.map((subject) => ({
        ...subject,
        questions: questions.filter(
          (q) =>
            q.subject === subject.subject &&
            (reviewFilter === "all" ||
              (reviewFilter === "wrong" && !q.isCorrect) ||
              (reviewFilter === "correct" && q.isCorrect) ||
              (reviewFilter === "easy-mistake" && !q.isCorrect && q.myChoice != null && q.groupAccuracy >= 70) ||
              (reviewFilter === "unanswered" && q.myChoice == null))
        ),
      })),
    [questions, subjects, reviewFilter]
  );

  const hardQuestionPreviewBySubject = useMemo(() => {
    const map = new Map<string, HardQuestionPreview[]>();
    for (const subject of subjects) {
      const actual = subject.hardQuestions.map((question) => ({
        id: question.id,
        number: question.number,
        subject: question.subject,
        wrongRate: question.peerWrongRate ?? 0,
        note: question.isCorrect ? "정답 문항" : question.myChoice == null ? "무응답 문항" : "오답 문항",
        elapsedSeconds: question.elapsedSeconds,
        isSample: false,
      }));
      map.set(subject.subject, actual);
    }
    return map;
  }, [subjects]);

  const wrongCount = questions.filter((q) => !q.isCorrect).length;
  const correctCount = questions.length - wrongCount;
  const easyMistakeCount = questions.filter(
    (q) => !q.isCorrect && q.myChoice != null && q.groupAccuracy >= 70
  ).length;
  const unansweredCount = questions.filter((q) => q.myChoice == null).length;

  const jumpToQuestion = (question: HardQuestionPreview) => {
    setReviewFilter("all");
    setOpenSubjects((prev) => ({ ...prev, [question.subject]: true }));
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .getElementById(`review-question-${question.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  return (
    <div className="space-y-6">
      <section className="chart-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">유형별 고오답률 문항</h2>
            <p className="mt-1 text-xs text-zinc-400">
              내 응시를 포함한 {participantCount}명의 오답률 기준
            </p>
          </div>
          <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-bold text-zinc-500">
            전체 기준
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {subjects.map((subject) => {
            const hardQuestions =
              hardQuestionPreviewBySubject.get(subject.subject) ?? [];
            return (
              <div key={subject.subject} className="soft-panel px-4 py-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-zinc-800">
                    {subject.subject}
                  </p>
                </div>
                {hardQuestions.length > 0 ? (
                  <ol className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {hardQuestions.map((q, index) => (
                      <li
                        key={`${q.id}-${index}`}
                      >
                      <button
                          type="button"
                          onClick={() => jumpToQuestion(q)}
                          className="w-full rounded-xl border border-white bg-white px-3 py-2 text-left text-xs shadow-sm transition hover:border-[#f4d4ce] hover:bg-[#fff7f5]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-zinc-700">
                              {q.number}번
                            </span>
                            <span className="font-extrabold text-brand">
                              {q.wrongRate}%
                            </span>
                          </div>
                          <p className="mt-1 leading-4 text-zinc-400">
                            {q.note} · {formatElapsedSeconds(q.elapsedSeconds)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs leading-5 text-zinc-400">
                    표시할 문항이 없습니다.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">문항별 리뷰</h2>
            <p className="mt-1 text-xs text-zinc-400">
              문제 원문, 자료, 보기, 해설을 함께 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap rounded-xl border border-hairline bg-white p-1 text-xs font-semibold shadow-sm">
            <button
              type="button"
              onClick={() => setReviewFilter("all")}
              className={`rounded-lg px-3 py-1.5 ${
                reviewFilter === "all" ? "bg-brand text-white" : "text-zinc-500"
              }`}
            >
              전체 {questions.length}
            </button>
            <button
              type="button"
              onClick={() => setReviewFilter("wrong")}
              className={`rounded-lg px-3 py-1.5 ${
                reviewFilter === "wrong" ? "bg-[#8f7d73] text-white" : "text-zinc-500"
              }`}
            >
              틀린 문제 {wrongCount}
            </button>
            <button
              type="button"
              onClick={() => setReviewFilter("correct")}
              className={`rounded-lg px-3 py-1.5 ${
                reviewFilter === "correct" ? "bg-[#f59a8e] text-white" : "text-zinc-500"
              }`}
            >
              맞춘 문제 {correctCount}
            </button>
            <button
              type="button"
              onClick={() => setReviewFilter("easy-mistake")}
              className={`rounded-lg px-3 py-1.5 ${
                reviewFilter === "easy-mistake" ? "bg-brand text-white" : "text-zinc-500"
              }`}
            >
              쉬운 문제 실수 {easyMistakeCount}
            </button>
            <button
              type="button"
              onClick={() => setReviewFilter("unanswered")}
              className={`rounded-lg px-3 py-1.5 ${
                reviewFilter === "unanswered" ? "bg-[#8f7d73] text-white" : "text-zinc-500"
              }`}
            >
              미응답 {unansweredCount}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {visibleBySubject.map((subject) => (
            <details
              key={subject.subject}
              open={
                reviewFilter === "all"
                  ? openSubjects[subject.subject]
                  : subject.questions.length > 0
              }
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenSubjects((prev) => ({
                  ...prev,
                  [subject.subject]: isOpen,
                }));
              }}
              className="chart-card"
            >
              <summary className="flex cursor-pointer select-none items-center px-5 py-4 font-semibold">
                <span aria-hidden="true" className="review-chevron mr-3 text-lg font-bold leading-none text-ink-2">
                  ▸
                </span>
                <span>
                  {subject.subject}{" "}
                  <span className="ml-1 text-sm font-normal text-zinc-400">
                  {subject.mine}/{subject.total}
                  {reviewFilter !== "all" && ` · 표시 ${subject.questions.length}문항`}
                  </span>
                </span>
                <span className="ml-auto text-sm font-normal text-zinc-400">
                  {formatSubjectElapsedSeconds(subject.elapsedSeconds)}
                </span>
              </summary>
              <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                {subject.questions.length > 0 ? (
                  subject.questions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      examId={examId}
                    />
                  ))
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-zinc-400">
                    표시할 문항이 없습니다.
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
      <ResultReviewChatbot questions={questions} participantCount={participantCount} />
    </div>
  );
}
