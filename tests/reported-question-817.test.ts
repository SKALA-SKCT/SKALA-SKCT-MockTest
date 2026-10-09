import assert from "node:assert/strict";
import test from "node:test";
import { applyQuestionContentOverride } from "../src/lib/question-overrides";

test("신고 문항 817의 누락 지문을 복원하고 정답과 보기를 보존한다", () => {
  const input = { number: 17, body: "OBCD 국가 중 결핵", choices: ["1", "2", "3", "4", "5"], answer: 2 };
  const question = applyQuestionContentOverride(9, input);
  for (const sentence of [
    "OECD 국가 중 결핵 유병률 1위",
    "전체 결핵 환자 수는 감소하고 있지만, 노인층에서는 오히려 증가세",
    "65세 이상 결핵 환자는 2001년보다 두 배 이상 증가",
    "2주 이상 지속되는 기침",
    "전염성은 폐결핵에서만 나타난다.",
    "기저질환이나 영양 불균형",
    "저체중 노인 등 고위험군은 매년 1회",
  ]) assert.ok(question.body.includes(sentence), sentence);
  assert.equal(question.pdfVerifiedBody, true);
  assert.equal(question.answer, 2);
  assert.deepEqual(question.choices, input.choices);
  assert.ok(question.explanation?.includes("정답은 ②이다."));
  assert.equal(input.body, "OBCD 국가 중 결핵");
});
