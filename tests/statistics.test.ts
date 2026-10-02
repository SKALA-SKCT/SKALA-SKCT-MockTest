import assert from "node:assert/strict";
import { test } from "node:test";
import { median } from "../src/lib/statistics";

test("중앙값은 빈 기록, 홀수, 짝수, 소수와 중복 점수를 처리한다", () => {
  assert.equal(median([]), 0);
  assert.equal(median([7]), 7);
  const scores = [100, 2, 10];
  assert.equal(median(scores), 10);
  assert.deepEqual(scores, [100, 2, 10]);
  assert.equal(median([0, 1, 2, 100]), 1.5);
  assert.equal(median([0, 0, 10]), 0);
  assert.ok(Math.abs(median([1.2, 2.4]) - 1.8) < 1e-10);
});
