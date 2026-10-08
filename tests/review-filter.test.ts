import assert from "node:assert/strict";
import { matchesReviewFilter, type ReviewQuestion } from "../src/components/ResultReview";

const questions = [
  { id: 1, myChoice: 1, isCorrect: true, groupAccuracy: 80 },
  { id: 2, myChoice: 2, isCorrect: false, groupAccuracy: 80 },
  { id: 3, myChoice: null, isCorrect: false, groupAccuracy: 80 },
] as ReviewQuestion[];

for (const [filter, ids] of [
  ["all", [1, 2, 3]],
  ["wrong", [2]],
  ["correct", [1]],
  ["easy-mistake", [2]],
  ["unanswered", [3]],
] as const) {
  assert.deepEqual(questions.filter((q) => matchesReviewFilter(q, filter)).map((q) => q.id), ids);
}

console.log("정답, 오답, 미응답 필터 구분 확인 통과");
