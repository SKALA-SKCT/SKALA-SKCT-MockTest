import assert from "node:assert/strict";
import test from "node:test";
import {
  getFixedReviewChatAnswer,
  retrieveReviewChatKnowledge,
} from "../src/lib/review-chat-knowledge";

test("서비스 감점 질문은 실제 시험과 섞지 않는다", () => {
  const answer = getFixedReviewChatAnswer("여기서는 틀리면 감점돼?", [
    { role: "user", content: "실제 시험에서는 오답 감점이 있어?" },
  ]);

  assert.match(answer ?? "", /오답 감점이 없습니다/);
  assert.match(answer ?? "", /정답은 1점/);
  assert.match(answer ?? "", /선택 n%/);
});

test("실제 시험 감점 질문에는 근거와 불확실성을 함께 안내한다", () => {
  const answer = getFixedReviewChatAnswer("실제 SKCT에서 틀리면 점수 떨어져?");

  assert.match(answer ?? "", /오답 감점이 있다고 안내/);
  assert.match(answer ?? "", /정확한 감점 폭과 계산식은/);
  assert.match(answer ?? "", /최신 안내문/);
});

test("모호한 감점 질문은 서비스와 실제 시험을 나눠 답한다", () => {
  const answer = getFixedReviewChatAnswer("틀리면 점수 깎여?");

  assert.match(answer ?? "", /이 실전 모의고사 서비스는 오답 감점이 없고/);
  assert.match(answer ?? "", /실제 SKCT 인지역량의 오답 감점/);
});

test("SKCT 명칭을 고정된 표현으로 답한다", () => {
  const answer = getFixedReviewChatAnswer("SKCT가 뭐야?");

  assert.match(answer ?? "", /SK Competency Test/);
  assert.doesNotMatch(answer ?? "", /둥근함께/);
});

test("서비스 지시어가 있으면 서비스 채점 근거가 최우선이다", () => {
  const chunks = retrieveReviewChatKnowledge("여기서는 감점되나 틀리면?", [
    { role: "user", content: "실제 시험에서는 어때?" },
  ]);

  assert.equal(chunks[0]?.id, "service-scoring");
});

test("영역별 풀이 팁을 검색한다", () => {
  const dataTips = retrieveReviewChatKnowledge("자료해석 풀이 팁 알려줘");
  const sequenceTips = retrieveReviewChatKnowledge("수열추리 규칙 찾는 순서 알려줘");

  assert.ok(dataTips.some((chunk) => chunk.id === "study-data-first-look"));
  assert.ok(dataTips.some((chunk) => chunk.id === "study-data-calculation"));
  assert.ok(sequenceTips.some((chunk) => chunk.id === "study-sequence"));
});

test("온라인 응시 질문은 시험 운영 근거를 검색한다", () => {
  const chunks = retrieveReviewChatKnowledge(
    "실제 시험에서 이전 문제로 돌아가거나 답을 수정할 수 있어?"
  );

  assert.ok(chunks.some((chunk) => chunk.id === "actual-online-navigation"));
});
