"use client";

import { useMemo, useState } from "react";

const CIRCLED = ["①", "②", "③", "④", "⑤"];

export type ReviewQuestion = {
  id: number;
  subject: string;
  number: number;
  body: string;
  imageUrl: string | null;
  choices: string[];
  answer: number;
  explanation: string | null;
  myChoice: number | null;
  isCorrect: boolean;
  groupAccuracy: number;
  peerWrongRate: number | null;
  choiceRates: number[] | null;
};

type SubjectSummary = {
  subject: string;
  mine: number;
  total: number;
  hardQuestions: ReviewQuestion[];
};

type HardQuestionPreview = {
  id: number;
  number: number;
  subject: string;
  wrongRate: number;
  note: string;
  isSample: boolean;
};

const SAMPLE_WRONG_RATES: Record<string, number[]> = {
  언어이해: [76, 68, 61],
  자료해석: [83, 77, 69],
  창의수리: [79, 72, 66],
  언어추리: [81, 74, 63],
  수열추리: [88, 80, 71],
};

const SAMPLE_NOTES: Record<string, string[]> = {
  언어이해: ["핵심 주장과 사례를 혼동", "부정 표현 조건 누락", "선지 범위 과대 해석"],
  자료해석: ["증감률과 증감량 혼동", "단위 변환 실수", "전년 대비 기준 착오"],
  창의수리: ["조건 조합 누락", "경우의 수 중복 계산", "비율식 설정 오류"],
  언어추리: ["충분조건·필요조건 혼동", "반례 조건 누락", "명제 방향 반대로 해석"],
  수열추리: ["두 규칙 교차 적용 실패", "분자·분모 규칙 혼동", "도형 위치 규칙 누락"],
};

const SAMPLE_CHOICE_RATES = [
  [12, 18, 44, 16, 10],
  [8, 52, 15, 17, 8],
  [21, 11, 14, 46, 8],
  [9, 13, 19, 12, 47],
  [38, 15, 12, 21, 14],
];

function sampleHardQuestions(subject: SubjectSummary, questions: ReviewQuestion[]) {
  const subjectQuestions = questions.filter((q) => q.subject === subject.subject);
  const rates = SAMPLE_WRONG_RATES[subject.subject] ?? [75, 68, 61];
  const notes = SAMPLE_NOTES[subject.subject] ?? ["조건 확인 필요", "계산 기준 착오", "선지 비교 실수"];

  return subjectQuestions.map((question, index) => ({
    id: question.id,
    number: question.number,
    subject: question.subject,
    wrongRate: rates[index] ?? Math.max(35, rates[0] - index * 3),
    note: notes[index % notes.length] ?? notes[0],
    isSample: true,
  }));
}

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

function WrongRate({ value }: { value: number | null }) {
  return (
    <span className={value != null && value >= 50 ? "text-red-500" : "text-zinc-400"}>
      다른 사람 오답률 {value == null ? "-" : `${value}%`}
    </span>
  );
}

function QuestionCard({
  question,
  isSampleMode,
}: {
  question: ReviewQuestion;
  isSampleMode: boolean;
}) {
  const choiceRates =
    question.choiceRates ??
    (isSampleMode ? SAMPLE_CHOICE_RATES[(question.number - 1) % SAMPLE_CHOICE_RATES.length] : null);
  const choiceRateLabel = question.choiceRates ? "선택" : "예시";

  return (
    <div id={`review-question-${question.id}`} className="scroll-mt-24 px-5 py-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <ResultPill question={question} />
        <span className="font-medium text-zinc-500">문제 {question.number}</span>
        <span className="ml-auto font-medium text-zinc-400">
          그룹 정답률 {question.groupAccuracy}%
        </span>
        <span className="font-medium">
          <WrongRate value={question.peerWrongRate} />
        </span>
      </div>

      <div className="rounded-xl bg-zinc-50 px-4 py-3">
        <p className="whitespace-pre-line text-sm leading-6 text-zinc-800">
          {question.body}
        </p>
        {question.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.imageUrl}
            alt={`${question.number}번 자료`}
            className="mt-3 w-full rounded-lg border border-zinc-200 bg-white"
          />
        )}
      </div>

      <div className="mt-3 grid gap-2">
        {question.choices.map((choice, index) => {
          const value = index + 1;
          const isAnswer = value === question.answer;
          const isMine = value === question.myChoice;
          return (
            <div
              key={value}
              className={`flex gap-2 rounded-lg border px-3 py-2 text-sm leading-6 ${
                isAnswer
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : isMine
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-zinc-100 bg-white text-zinc-600"
              }`}
            >
              <span className="shrink-0 font-bold">{CIRCLED[index]}</span>
              <span className="min-w-0 flex-1 whitespace-pre-line">{choice}</span>
              <span className="ml-auto flex shrink-0 items-center gap-2 text-xs">
                {choiceRates && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-500">
                    {choiceRateLabel} {choiceRates[index] ?? 0}%
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

      <p className="mt-3 text-xs text-zinc-500">
        내 답: {question.myChoice ? CIRCLED[question.myChoice - 1] : "-"} · 정답:{" "}
        <b className="text-zinc-700">{CIRCLED[question.answer - 1]}</b>
      </p>

      {question.explanation && (
        <p className="mt-2 whitespace-pre-line rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-500">
          {question.explanation}
        </p>
      )}
    </div>
  );
}

export default function ResultReview({
  questions,
  subjects,
  peerCount,
}: {
  questions: ReviewQuestion[];
  subjects: SubjectSummary[];
  peerCount: number;
}) {
  const [wrongOnly, setWrongOnly] = useState(false);
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});

  const visibleBySubject = useMemo(
    () =>
      subjects.map((subject) => ({
        ...subject,
        questions: questions.filter(
          (q) => q.subject === subject.subject && (!wrongOnly || !q.isCorrect)
        ),
      })),
    [questions, subjects, wrongOnly]
  );

  const hardQuestionPreviewBySubject = useMemo(() => {
    const map = new Map<string, HardQuestionPreview[]>();
    for (const subject of subjects) {
      const actual = subject.hardQuestions.map((question) => ({
        id: question.id,
        number: question.number,
        subject: question.subject,
        wrongRate: question.peerWrongRate ?? 0,
        note: "다른 응시자 기준 고오답률",
        isSample: false,
      }));
      map.set(
        subject.subject,
        actual.length > 0 ? actual : sampleHardQuestions(subject, questions)
      );
    }
    return map;
  }, [questions, subjects]);

  const wrongCount = questions.filter((q) => !q.isCorrect).length;
  const isSampleMode = peerCount === 0;

  const jumpToQuestion = (question: HardQuestionPreview) => {
    setWrongOnly(false);
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
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">유형별 고오답률 문항</h2>
            <p className="mt-1 text-xs text-zinc-400">
              {peerCount > 0
                ? `내 응시를 제외한 ${peerCount}명의 오답률 기준`
                : "아직 다른 응시자 데이터가 없어 샘플 오답률로 화면을 미리 보여줍니다."}
            </p>
          </div>
          {isSampleMode && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              예시 데이터
            </span>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {subjects.map((subject) => {
            const hardQuestions =
              hardQuestionPreviewBySubject.get(subject.subject) ?? [];
            return (
              <div
                key={subject.subject}
                className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-zinc-800">
                    {subject.subject}
                  </p>
                  {hardQuestions[0]?.isSample && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-amber-600">
                      샘플
                    </span>
                  )}
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
                          className="w-full rounded-lg border border-white bg-white px-3 py-2 text-left text-xs shadow-sm transition hover:border-red-100 hover:bg-red-50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-zinc-700">
                              {q.number}번
                            </span>
                            <span className="font-extrabold text-red-500">
                              {q.wrongRate}%
                            </span>
                          </div>
                          <p className="mt-1 leading-4 text-zinc-400">{q.note}</p>
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
        {isSampleMode && (
          <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-500">
            실제 다른 응시자 기록이 생기면 샘플 문항은 사라지고, 같은 영역에
            실제 유형별 고오답률 상위 문항이 자동으로 표시됩니다.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">문항별 리뷰</h2>
            <p className="mt-1 text-xs text-zinc-400">
              문제 원문, 자료, 보기, 해설을 함께 확인합니다.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-1 text-xs font-semibold shadow-sm">
            <button
              type="button"
              onClick={() => setWrongOnly(false)}
              className={`rounded-lg px-3 py-1.5 ${
                !wrongOnly ? "bg-zinc-900 text-white" : "text-zinc-500"
              }`}
            >
              전체 {questions.length}
            </button>
            <button
              type="button"
              onClick={() => setWrongOnly(true)}
              className={`rounded-lg px-3 py-1.5 ${
                wrongOnly ? "bg-red-600 text-white" : "text-zinc-500"
              }`}
            >
              틀린 문제 {wrongCount}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {visibleBySubject.map((subject) => (
            <details
              key={subject.subject}
              open={wrongOnly ? subject.questions.length > 0 : openSubjects[subject.subject]}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenSubjects((prev) => ({
                  ...prev,
                  [subject.subject]: isOpen,
                }));
              }}
              className="rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              <summary className="cursor-pointer select-none px-5 py-4 font-semibold">
                {subject.subject}{" "}
                <span className="ml-1 text-sm font-normal text-zinc-400">
                  {subject.mine}/{subject.total}
                  {wrongOnly && ` · 표시 ${subject.questions.length}문항`}
                </span>
              </summary>
              <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                {subject.questions.length > 0 ? (
                  subject.questions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      isSampleMode={isSampleMode}
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
    </div>
  );
}
