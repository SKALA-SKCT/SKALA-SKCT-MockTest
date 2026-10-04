import assert from "node:assert/strict";
import test from "node:test";
import { applyQuestionContentOverride } from "../src/lib/question-overrides";

test("9회차 48번은 B 출발 후 첫 만남을 정답으로 표시한다", () => {
  const question = applyQuestionContentOverride(9, {
    number: 48,
    body: "",
    choices: ["20분", "24분", "28분", "32분", "36분"],
    answer: 2,
    explanation: "",
  });
  const headStartDistance = 4000 * 4 / 60;
  const relativeSpeed = (6000 - 4000) / 60;
  const firstMeetingAfterBStarts = 4 + headStartDistance / relativeSpeed;
  assert.equal(firstMeetingAfterBStarts, 12);
  assert.equal(question.choices[question.answer - 1], `${firstMeetingAfterBStarts}분`);
  assert.match(question.explanation, /4 \+ 8 = 12분/);
});
