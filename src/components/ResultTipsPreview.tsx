"use client";

import { useState } from "react";
import ResultReviewTools from "@/components/ResultReviewTools";
import { QuestionCard, type ReviewQuestion } from "@/components/ResultReview";

export default function ResultTipsPreview({ questions }: { questions: ReviewQuestion[] }) {
  const [question, setQuestion] = useState(questions[0]);
  return <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]"><div className="chart-card"><QuestionCard question={question} examId={0} localNumber={questions.filter((q) => q.subject === question.subject).findIndex((q) => q.id === question.id) + 1} /></div><ResultReviewTools examId={0} questions={questions} participantCount={24} onSelectQuestion={setQuestion} previewTips initialTool="tips" /></div>;
}
