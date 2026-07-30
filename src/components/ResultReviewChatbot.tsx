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

function findMentionedQuestions(message: string, questions: ReviewQuestion[]) {
  const mentionedSubjects = SUBJECTS.filter((subject) =>
    message.includes(subject)
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
    const localNumber =
      questions
        .filter((item) => item.subject === question.subject)
        .sort((a, b) => a.number - b.number)
        .findIndex((item) => item.id === question.id) + 1;
    const numberMatched =
      mentionedNumbers.length === 0 ||
      mentionedNumbers.includes(localNumber);
    return subjectMatched && numberMatched;
  });

  return matched.slice(0, 5);
}

function getSubjectLocalNumber(question: ReviewQuestion, questions: ReviewQuestion[]) {
  return (
    questions
      .filter((item) => item.subject === question.subject)
      .sort((a, b) => a.number - b.number)
      .findIndex((item) => item.id === question.id) + 1
  );
}

function questionSummary(question: ReviewQuestion, questions: ReviewQuestion[]) {
  const localNumber = getSubjectLocalNumber(question, questions);
  return {
    subject: question.subject,
    number: question.number,
    localNumber,
    displayLabel: `${question.subject} ${localNumber}번`,
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

function parseInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-black text-inherit">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] text-zinc-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split(/\n+/).filter((line) => line.trim().length > 0);

  return (
    <div className="space-y-1.5 text-xs leading-5 text-inherit">
      {lines.map((line, index) => {
        const bullet = line.match(/^\s*[-*]\s+(.+)$/);
        const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
        const heading = line.match(/^#{1,3}\s+(.+)$/);

        if (heading) {
          return (
            <p key={index} className="font-black">
              {parseInlineMarkdown(heading[1])}
            </p>
          );
        }

        if (bullet || ordered) {
          return (
            <div key={index} className="flex gap-1.5">
              <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
              <p className="min-w-0 flex-1">{parseInlineMarkdown((bullet ?? ordered)?.[1] ?? line)}</p>
            </div>
          );
        }

        return <p key={index}>{parseInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

export default function ResultReviewChatbot({
  questions,
  participantCount,
}: {
  questions: ReviewQuestion[];
  participantCount: number;
}) {
  const [input, setInput] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const availableSubjects = useMemo(() => {
    return SUBJECTS.filter((subject) =>
      questions.some((question) => question.subject === subject)
    );
  }, [questions]);

  const subjectQuestionNumbers = useMemo(() => {
    if (!selectedSubject) return [];
    return questions
      .filter((question) => question.subject === selectedSubject)
      .sort((a, b) => a.number - b.number)
      .map((_, index) => index + 1);
  }, [questions, selectedSubject]);

  const showMentionPicker = input.includes("@");
  const selectedNumber = Number(input.match(/(\d{1,2})번/)?.[1] ?? 0);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const mentionedQuestions = findMentionedQuestions(text, questions);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSelectedSubject(null);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/review-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          history: messages.slice(-6),
          participantCount,
          mentionedQuestions: mentionedQuestions.map((question) =>
            questionSummary(question, questions)
          ),
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

  const selectSubject = (subject: string) => {
    setSelectedSubject(subject);
    setInput((current) => {
      const mentionStart = current.indexOf("@");
      const prefix = mentionStart >= 0 ? current.slice(0, mentionStart).trimEnd() : current.trimEnd();
      return `${prefix}${prefix ? " " : ""}@${subject} `;
    });
  };

  const selectQuestionNumber = (number: number) => {
    setInput((current) => {
      const mentionStart = current.indexOf("@");
      const prefix = mentionStart >= 0 ? current.slice(0, mentionStart).trimEnd() : "";
      const subject = selectedSubject ?? availableSubjects[0] ?? "";
      return `${prefix}${prefix ? " " : ""}@${subject} ${number}번 `;
    });
  };

  return (
    <aside className="chart-card sticky top-20 flex h-[calc(100vh-9rem)] min-h-[560px] flex-col overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
        <div>
          <p className="text-sm font-black text-zinc-900">문항 리뷰 챗봇</p>
        </div>
        <div className="group relative ml-auto">
          <button
            type="button"
            aria-label="챗봇 사용 안내"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs font-black text-zinc-500 transition hover:border-brand hover:text-brand"
          >
            ?
          </button>
          <div className="pointer-events-none absolute right-0 top-9 z-10 w-72 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs leading-5 text-zinc-500 opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100">
            채팅 기록은 저장되지 않아 페이지를 나가거나 새로고침하면 사라집니다.
            <br />
            @21번, @자료해석, @자료해석 21번처럼 언급하고 해설, 풀이 팁,
            함정, 오답 선택 이유를 물어보세요.
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 space-y-2 overflow-y-auto bg-zinc-50 px-3 py-3">
        {messages.length === 0 && !loading && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-8 text-center">
            <p className="text-lg font-semibold text-zinc-300/70">
              AI에게 질문해보세요!
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex min-w-0 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`min-w-0 max-w-[86%] rounded-2xl px-3 py-2 [overflow-wrap:anywhere] [word-break:keep-all] ${
                message.role === "user"
                  ? "bg-brand text-white"
                  : "border border-zinc-100 bg-white text-zinc-700"
              }`}
            >
              <MarkdownMessage content={message.content} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-100 bg-white px-3 py-2 text-xs font-bold text-zinc-400">
              <span>답변 생성 중</span>
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand/70 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand/70 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand/70" />
              </span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="shrink-0 border-t border-zinc-100 bg-white p-3">
        {showMentionPicker && (
          <div className="mb-2 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {availableSubjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => selectSubject(subject)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                    selectedSubject === subject
                      ? "bg-brand text-white"
                      : "bg-zinc-50 text-zinc-500 hover:bg-red-50 hover:text-brand"
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
            {selectedSubject && (
              <div className="grid grid-cols-5 gap-1.5 rounded-xl bg-zinc-50 p-2">
                {subjectQuestionNumbers.map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => selectQuestionNumber(number)}
                    className={`h-7 rounded-full px-1 text-[11px] font-bold shadow-sm transition ${
                      selectedNumber === number
                        ? "bg-brand text-white"
                        : "bg-white text-zinc-500 hover:bg-red-50 hover:text-brand"
                    }`}
                  >
                    {number}번
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-2">
          <input
            value={input}
            onChange={(event) => {
              const value = event.target.value;
              setInput(value);
              if (!value.includes("@")) {
                setSelectedSubject(null);
              } else {
                const matchedSubject = availableSubjects.find((subject) =>
                  value.includes(`@${subject}`)
                );
                setSelectedSubject(matchedSubject ?? selectedSubject);
              }
            }}
            placeholder="@수열추리 4번 왜 틀렸는지 알려줘"
            className="h-10 rounded-xl border border-zinc-200 px-3 text-xs outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-10 rounded-[10px] bg-ink text-xs font-medium text-white transition hover:bg-brand hover:-translate-y-px disabled:opacity-40"
          >
            전송
          </button>
        </div>
      </form>
    </aside>
  );
}
