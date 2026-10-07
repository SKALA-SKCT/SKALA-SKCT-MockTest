import assert from "node:assert/strict";
import { test } from "node:test";
import { flushPendingAnswers, restorePendingAnswers, resumeQuestionIndex } from "../src/lib/exam-recovery";

test("답안 복원, 실패 보관, 순차 저장과 저장 중 변경을 검증한다", async () => {
  const choices = new Map([[1, 5], [2, 4]]);
  assert.equal(restorePendingAnswers("broken", choices).size, 0);
  assert.equal(restorePendingAnswers('[1,2]', choices).size, 0);
  const pending = restorePendingAnswers('{"1":2,"2":null,"99":1,"3":"1"}', choices);
  assert.equal(pending.size, 2);
  assert.equal(restorePendingAnswers('{"1":6,"2":0}', choices).size, 0);
  assert.equal(await flushPendingAnswers(pending, async () => { throw new Error("offline"); }, () => {}), false);
  assert.equal(pending.size, 2);
  let calls = 0;
  const saved: Array<[number, number | null]> = [];
  assert.equal(await flushPendingAnswers(pending, async (id, choice) => {
    saved.push([id, choice]);
    if (++calls === 1) pending.set(1, { choice: 5 });
    return true;
  }, () => {}), true);
  assert.deepEqual(saved, [[1, 2], [1, 5], [2, null]]);
  assert.equal(pending.size, 0);
  pending.set(2, { choice: 3 });
  assert.equal(await flushPendingAnswers(pending, async () => false, () => {}), false);
  assert.equal(pending.get(2)?.choice, 3);
});

test("새 탭에서는 현재 영역에서 마지막으로 연 문항을 복원한다", () => {
  assert.equal(resumeQuestionIndex([91, 45, 12], []), 0);
  assert.equal(resumeQuestionIndex([91, 45, 12], [91, 45]), 1);
  assert.equal(resumeQuestionIndex([91, 45, 12], [12, 91, 45]), 2);
  assert.equal(resumeQuestionIndex([91, 45, 12], [1000]), 0);
});
