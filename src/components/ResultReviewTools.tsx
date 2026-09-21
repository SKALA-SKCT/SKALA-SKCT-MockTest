"use client";

import { useState } from "react";
import ResultReviewChatbot from "@/components/ResultReviewChatbot";
import Calculator from "@/components/exam/Calculator";
import MemoPad from "@/components/exam/MemoPad";
import type { ReviewQuestion } from "@/components/ResultReview";

type Tool = "chat" | "tools";

export default function ResultReviewTools({ examId, questions, participantCount }: { examId: number; questions: ReviewQuestion[]; participantCount: number }) {
  const [tool, setTool] = useState<Tool>("chat");
  const labels: Array<[Tool, string]> = [["chat", "챗봇"], ["tools", "도구"]];
  return (
    <aside className="min-w-0 xl:sticky xl:top-24">
      <div className="mb-2 grid grid-cols-2 rounded-xl border border-hairline bg-white p-1 shadow-sm" aria-label="리뷰 도구">
        {labels.map(([value, label]) => <button key={value} type="button" onClick={() => setTool(value)} className={`rounded-lg px-2 py-2 text-xs font-bold transition ${tool === value ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>{label}</button>)}
      </div>
      {tool === "chat" && <ResultReviewChatbot examId={examId} questions={questions} participantCount={participantCount} />}
      {tool === "tools" && (
        <div className="rounded-xl border border-hairline bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <MemoPad key={`memo:result:${examId}`} resetKey={`result:${examId}`} />
            <Calculator key={`calculator:result:${examId}`} />
          </div>
        </div>
      )}
    </aside>
  );
}
