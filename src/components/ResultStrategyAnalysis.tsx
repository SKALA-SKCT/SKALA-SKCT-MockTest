"use client";

import { useCallback, useEffect, useState } from "react";

type StrategySubject = {
  subject: string;
  score: number;
  total: number;
  accuracy: number;
  averageAccuracy: number;
  elapsedSeconds: number;
};

type StrategyQuestion = {
  subject: string;
  number: number;
  status: "정답" | "오답" | "미응답";
  isEasyMistake: boolean;
  elapsedSeconds: number;
  peerWrongRate: number | null;
  difficulty: "고오답률" | "저오답률" | "분석 불가";
};

export type StrategyAnalysisInput = {
  attemptId: number;
  examTitle: string;
  round: number;
  score: number;
  total: number;
  rank: number;
  participants: number;
  unanswered: number;
  easyMistakes: number;
  subjects: StrategySubject[];
  questions: StrategyQuestion[];
};

type StrategyAnalysisResult = {
  summary: string;
  priorities: string[];
  actions: string[];
  provider: "gemini";
};

export default function ResultStrategyAnalysis({
  input,
  initialResult,
}: {
  input: StrategyAnalysisInput;
  initialResult?: StrategyAnalysisResult | null;
}) {
  const [result, setResult] = useState<StrategyAnalysisResult | null>(
    initialResult ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/result-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as
        | StrategyAnalysisResult
        | { error?: string };
      if (!response.ok || !("summary" in payload)) {
        throw new Error("error" in payload ? payload.error : "분석에 실패했습니다.");
      }
      setResult(payload);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "분석에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [input]);

  useEffect(() => {
    if (initialResult) {
      setResult(initialResult);
      setError(null);
      setLoading(false);
      return;
    }

    setResult(null);
    setError(null);
    const timer = window.setTimeout(() => {
      void generateAnalysis();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [generateAnalysis, initialResult]);

  return (
    <section className="chart-card mb-6 border-brand/20 bg-[#fffdfc] p-5">
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">AI 핵심 진단</h2>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-brand">
              Gemini
            </span>
          </div>
        </div>
        <div className="group relative">
          <button
            type="button"
            aria-label="AI 핵심 진단 안내"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-xs font-bold text-ink-2 transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            ?
          </button>
          <div className="pointer-events-none absolute right-0 top-8 z-10 w-64 rounded-lg border border-line bg-white px-3 py-2 text-xs leading-5 text-ink-2 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">
            응시자가 늘어 최신 데이터가 반영되면 AI 진단 내용도 변경될 수 있습니다.
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-brand">
          {error}
        </p>
      )}

      {!result && !error && loading && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-page px-4 py-3 text-sm text-ink-2">
          <div className="flex h-8 w-20 shrink-0 items-center justify-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-brand"
                style={{ animationDelay: `${index * 140}ms` }}
              />
            ))}
          </div>
          <span>Gemini가 응시 데이터를 분석하고 있습니다.</span>
        </div>
      )}

      {result && (
        <div className="grid gap-3">
          <div className="rounded-xl border border-[#f4d4ce] bg-[#fff7f5] p-4">
            <p className="text-xs font-bold text-brand">핵심 진단</p>
            <p className="mt-2 text-sm leading-5 text-ink-2">
              {result.summary}
            </p>
          </div>
          <div className="rounded-xl border border-[#eadfbd] bg-[#fffaf0] p-4">
            <p className="text-xs font-bold text-brand">우선 개선할 점</p>
            <ul className="mt-2 space-y-2 text-sm leading-5 text-ink-2">
              {result.priorities.map((priority) => (
                <li key={priority} className="flex gap-2">
                  <span className="text-brand">•</span>
                  <span>{priority}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[#cfe4d5] bg-[#f4fbf5] p-4">
            <p className="text-xs font-bold text-brand">다음 응시 행동</p>
            <ul className="mt-2 space-y-2 text-sm leading-5 text-ink-2">
              {result.actions.map((action) => (
                <li key={action} className="flex gap-2">
                  <span className="text-series-class">✓</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
