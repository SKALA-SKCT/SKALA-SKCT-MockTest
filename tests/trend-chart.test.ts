import assert from "node:assert/strict";
import { test } from "node:test";
import { isIsolatedTrendPoint, type TrendDatum } from "../src/components/TrendChart";

test("떨어진 점수만 점으로 표시한다", () => {
  for (const [scores, expected] of [
    [[53, null, null], [true, false, false]],
    [[53, null, 60], [true, false, true]],
    [[53, 60, null], [false, false, false]],
    [[53, 60, null, 0], [false, false, false, true]],
    [[null, null, null], [false, false, false]],
  ] as Array<[Array<number | null>, boolean[]]>) {
    const data: TrendDatum[] = scores.map((score, index) => ({ name: String(index), 나: score, 그룹평균: score, 그룹중앙값: null }));
    for (const key of ["나", "그룹평균"] as const) {
      assert.deepEqual(data.map((_, index) => isIsolatedTrendPoint(data, index, key)), expected);
    }
  }
});
