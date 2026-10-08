"use client";

import { useState } from "react";
import ResultReviewChatbot from "@/components/ResultReviewChatbot";
import ResultReviewTips from "@/components/ResultReviewTips";
import ResultReviewNote from "@/components/ResultReviewNote";
import Calculator from "@/components/exam/Calculator";
import MemoPad from "@/components/exam/MemoPad";
import type { ReviewQuestion } from "@/components/ResultReview";

type Tool = "chat" | "tools" | "note" | "tips" | "tutor";

// 상단 헤더와 탭 높이를 빼고 화면 아래 여백을 남긴다.
const PANEL_HEIGHT = "h-[calc(100vh-11rem)] min-h-[480px]";
// AI 튜터는 별도 서비스(ai-tutor.skala-skct.com)의 /embed 화면을 넣는다. 같은 사이트라 로그인 쿠키가 그대로 쓰인다.
const AI_TUTOR_EMBED_URL = `${process.env.NEXT_PUBLIC_AI_TUTOR_URL ?? "https://ai-tutor.skala-skct.com"}/embed`;

export default function ResultReviewTools({
  examId,
  questions,
  participantCount,
  onSelectQuestion,
  previewTips = false,
  initialTool = "chat",
}: {
  previewTips?: boolean;
  initialTool?: Tool;
  examId: number;
  questions: ReviewQuestion[];
  participantCount: number;
  onSelectQuestion: (question: ReviewQuestion) => void;
}) {
  const [tool, setTool] = useState<Tool>(initialTool);
  // 노트는 처음 열 때 만들고 이후에는 숨기기만 해서 작성 중인 그림과 저장 대기 내용을 보존한다.
  const [noteOpened, setNoteOpened] = useState(false);
  const [tipsOpened, setTipsOpened] = useState(initialTool === "tips");
  // AI 튜터도 노트처럼 처음 열 때 만들고 이후에는 숨기기만 해서 올린 캡처와 답변을 보존한다.
  const [tutorOpened, setTutorOpened] = useState(initialTool === "tutor");
  const labels: Array<[Tool, string]> = [["chat", "챗봇"], ["tools", "도구"], ["note", "노트"], ["tips", "풀이팁"], ["tutor", "AI 튜터"]];
  const selectTool = (value: Tool) => {
    setTool(value);
    if (value === "tips") setTipsOpened(true);
    if (value === "note") setNoteOpened(true);
    if (value === "tutor") setTutorOpened(true);
  };
  return (
    <aside className="min-w-0 xl:sticky xl:top-24">
      <div className="mb-2 grid grid-cols-5 rounded-xl border border-hairline bg-white p-1 shadow-sm" aria-label="리뷰 도구">
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
      {tipsOpened && <div className={`${PANEL_HEIGHT} ${tool === "tips" ? "" : "hidden"}`}><ResultReviewTips preview={previewTips} questions={questions} onSelectQuestion={onSelectQuestion} /></div>}
      {noteOpened && (
        <div className={`${PANEL_HEIGHT} ${tool === "note" ? "" : "hidden"}`}>
          <ResultReviewNote questions={questions} onSelectQuestion={onSelectQuestion} />
        </div>
      )}
      {tutorOpened && (
        <div className={`${PANEL_HEIGHT} overflow-hidden rounded-xl border border-hairline bg-white shadow-sm ${tool === "tutor" ? "" : "hidden"}`}>
          <iframe src={AI_TUTOR_EMBED_URL} title="AI 튜터" className="h-full w-full border-0" />
        </div>
      )}
    </aside>
  );
}
