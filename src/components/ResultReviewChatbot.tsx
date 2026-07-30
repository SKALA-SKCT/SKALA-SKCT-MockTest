"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReviewQuestion } from "@/components/ResultReview";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SUBJECTS = ["언어이해", "자료해석", "창의수리", "언어추리", "수열추리"];
const CIRCLED = ["①", "②", "③", "④", "⑤"];

function formatElapsedSeconds(value: number | null) {
  if (value == null) return "0초";
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
}

function normalizeMention(value: string) {
  return value.replace(/^@/, "").trim();
}

function findMentionedQuestions(message: string, questions: ReviewQuestion[]) {
  const mentionedSubjects = SUBJECTS.filter((subject) =>
    message.includes(`@${subject}`)
  );
  const mentionedNumbers = Array.from(message.matchAll(/@?(\d{1,3})번/g))
    .map((match) => Number(match[1]))
    .filter((number) => Number.isInteger(number));

  if (!mentionedSubjects.length && !mentionedNumbers.length) {
    return [];
  }

  const matched = questions.filter((question) => {
    const subjectMatched =
      mentionedSubjects.length === 0 || mentionedSubjects.includes(question.subject);
    const numberMatched =
      mentionedNumbers.length === 0 || mentionedNumbers.includes(question.number);
    return subjectMatched && numberMatched;
  });

  return matched.slice(0, 5);
}

function questionSummary(question: ReviewQuestion) {
  return {
    subject: question.subject,
    number: question.number,
    body: question.body,
    choices: question.choices.map((choice, index) => ({
      number: index + 1,
      label: CIRCLED[index],
      text: choice,
      selectedRatePercent: question.choiceRates?.[index] ?? null,
      isMyChoice: question.myChoice === index + 1,
      isAnswer: question.answer === index + 1,
    })),
    answer: question.answer,
    explanation: question.explanation,
    myChoice: question.myChoice,
    myChoiceLabel: question.myChoice ? CIRCLED[question.myChoice - 1] : null,
    isCorrect: question.isCorrect,
    elapsedSeconds: question.elapsedSeconds,
    elapsedText: formatElapsedSeconds(question.elapsedSeconds),
    wrongRatePercent: question.peerWrongRate,
    groupAccuracyPercent: question.groupAccuracy,
  };
}

export default function ResultReviewChatbot({
  questions,
  participantCount,
}: {
  questions: ReviewQuestion[];
  participantCount: number;
}) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "@문제번호 또는 @문제유형을 붙여 질문하면 해당 문항 정보와 내 풀이 기록을 기준으로 설명해드릴게요.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const mentionHints = useMemo(() => {
    const hard = [...questions]
      .sort((a, b) => (b.peerWrongRate ?? 0) - (a.peerWrongRate ?? 0))
      .slice(0, 3);
    return hard.map((q) => `@${q.number}번`).join(" ");
  }, [questions]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const mentionedQuestions = findMentionedQuestions(text, questions);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/review-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          participantCount,
          mentionedQuestions: mentionedQuestions.map(questionSummary),
        }),
      });
      const payload = (await response.json()) as { answer?: string; error?: string };
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            response.ok && payload.answer
              ? payload.answer
              : (payload.error ?? "답변을 만들지 못했습니다. 잠시 후 다시 시도해주세요."),
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "답변을 만들지 못했습니다. 잠시 후 다시 시도해주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)]">
      {open ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
            <div>
              <p className="text-sm font-black text-zinc-900">문항 리뷰 챗봇</p>
              <p className="text-[11px] text-zinc-400">대화 기록은 저장되지 않습니다.</p>
            </div>
            <div className="group relative ml-auto">
              <button
                type="button"
                aria-label="챗봇 사용 안내"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs font-black text-zinc-500 transition hover:border-brand hover:text-brand"
              >
                ?
              </button>
              <div className="pointer-events-none absolute right-0 top-9 w-72 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs leading-5 text-zinc-500 opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100">
                채팅 기록은 저장되지 않아 페이지를 나가거나 새로고침하면 사라집니다.
                <br />
                @21번, @자료해석, @자료해석 21번처럼 언급하고 해설, 풀이 팁,
                함정, 오답 선택 이유를 물어보세요.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
              aria-label="챗봇 접기"
            >
              ×
            </button>
          </div>

          <div className="max-h-[360px] space-y-2 overflow-y-auto bg-zinc-50 px-3 py-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[86%] whitespace-pre-line rounded-2xl px-3 py-2 text-xs leading-5 ${
                    message.role === "user"
                      ? "bg-brand text-white"
                      : "border border-zinc-100 bg-white text-zinc-700"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <p className="rounded-2xl border border-zinc-100 bg-white px-3 py-2 text-xs text-zinc-400">
                  답변 생성 중...
                </p>
              </div>
            )}
          </div>

          <form onSubmit={submit} className="border-t border-zinc-100 bg-white p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {["@자료해석", "@언어추리", mentionHints].filter(Boolean).map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() =>
                    setInput((current) =>
                      `${current}${current.trim() ? " " : ""}${normalizeMention(hint).startsWith("@") ? hint : hint} `
                    )
                  }
                  className="rounded-full bg-zinc-50 px-2 py-1 text-[11px] font-semibold text-zinc-500 hover:bg-red-50 hover:text-brand"
                >
                  {hint}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="@21번 왜 헷갈렸는지 알려줘"
                className="h-10 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-10 rounded-xl bg-brand text-xs font-black text-white transition hover:bg-red-600 disabled:opacity-40"
              >
                전송
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto flex h-12 items-center rounded-full bg-brand px-5 text-sm font-black text-white shadow-2xl transition hover:bg-red-600"
        >
          문항 챗봇
        </button>
      )}
    </aside>
  );
}
