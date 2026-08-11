import assert from "node:assert/strict";
import test from "node:test";

import {
  appendCalculatorInput,
  calculate,
} from "../src/components/exam/calculatorLogic.ts";

test("소수 입력을 유지해 21.3을 10으로 나눈다", () => {
  let expression = "0";
  for (const value of ["2", "1", ".", "3", "÷", "1", "0"]) {
    expression = appendCalculatorInput(expression, value, false);
  }

  assert.equal(expression, "21.3÷10");
  assert.equal(calculate(expression), 2.13);
});

test("연산자 바로 뒤의 소수는 0으로 시작한다", () => {
  assert.equal(appendCalculatorInput("21÷", ".", false), "21÷0.");
});
