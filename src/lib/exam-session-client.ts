import type { SectionState, Subject } from "@/db/schema";

type SectionResult = { sectionState: SectionState; finished?: boolean };
async function request<T>(examId: number, body: object): Promise<T> {
  const response = await fetch(`/api/exam/${examId}/session`, {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("응시 요청을 처리하지 못했습니다.");
  return response.json();
}
export const startSection = (examId: number, subject: Subject, attemptId: number) => request<SectionResult>(examId, { action: "startSection", subject, attemptId });
export const finishSection = (examId: number, subject: Subject, attemptId: number) => request<SectionResult>(examId, { action: "finishSection", subject, attemptId });
export const startQuestion = (examId: number, questionId: number, attemptId: number) => request<{ ok: boolean }>(examId, { action: "startQuestion", questionId, attemptId });
export const saveAnswer = (examId: number, questionId: number, choice: number | null, attemptId: number) => request<{ ok: boolean }>(examId, { action: "saveAnswer", questionId, choice, attemptId });
export const abandonAttempt = (examId: number, attemptId: number) => request<{ ok: boolean }>(examId, { action: "abandon", attemptId });
