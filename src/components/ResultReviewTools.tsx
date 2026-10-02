"use client";

import { useState } from "react";
import ResultReviewChatbot from "@/components/ResultReviewChatbot";
import ResultReviewNote from "@/components/ResultReviewNote";
import Calculator from "@/components/exam/Calculator";
import MemoPad from "@/components/exam/MemoPad";
import type { ReviewQuestion } from "@/components/ResultReview";

type Tool = "chat" | "tools" | "note";

// 상단 헤더와 탭 높이를 빼고 화면 아래 여백을 남긴다.
const PANEL_HEIGHT = "h-[calc(100vh-11rem)] min-h-[480px]";

export default function ResultReviewTools({
  examId,
  questions,
  participantCount,
  onSelectQuestion,
}: {
  examId: number;
  questions: ReviewQuestion[];
  participantCount: number;
  onSelectQuestion: (question: ReviewQuestion) => void;
}) {
  const [tool, setTool] = useState<Tool>("chat");
  // 노트는 처음 열 때 만들고 이후에는 숨기기만 해서 작성 중인 그림과 저장 대기 내용을 보존한다.
  const [noteOpened, setNoteOpened] = useState(false);
  const labels: Array<[Tool, string]> = [["chat", "챗봇"], ["tools", "도구"], ["note", "노트"]];
  const selectTool = (value: Tool) => {
    setTool(value);
    if (value === "note") setNoteOpened(true);
  };
  return (
    <aside className="min-w-0 xl:sticky xl:top-24">
      <div className="mb-2 grid grid-cols-3 rounded-xl border border-hairline bg-white p-1 shadow-sm" aria-label="리뷰 도구">
        {labels.map(([value, label]) => <button key={value} type="button" onClick={() => selectTool(value)} className={`rounded-lg px-2 py-2 text-xs font-bold transition ${tool === value ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>{label}</button>)}
      </div>
      {tool === "chat" && (
        <div className={PANEL_HEIGHT}>
          <ResultReviewChatbot examId={examId} questions={questions} participantCount={participantCount} />
        </div>
      )}
      {tool === "tools" && (
        <div className="rounded-xl border border-hairline bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <MemoPad key={`memo:result:${examId}`} resetKey={`result:${examId}`} />
            <Calculator key={`calculator:result:${examId}`} />
          </div>
        </div>
      )}
      {noteOpened && (
        <div className={`${PANEL_HEIGHT} ${tool === "note" ? "" : "hidden"}`}>
          <ResultReviewNote questions={questions} onSelectQuestion={onSelectQuestion} />
        </div>
      )}
    </aside>
  );
}
