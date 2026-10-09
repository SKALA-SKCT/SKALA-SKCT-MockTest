import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { transpile } from "typescript";

const source = readFileSync(new URL("../src/components/ExamRunner.tsx", import.meta.url), "utf8");
const advance = source.slice(source.indexOf("  const advanceQuestion ="), source.indexOf("  const goNext ="));
const finish = source.slice(source.indexOf("  const handleFinishSection ="), source.indexOf("  const startCurrentSection ="));

function setup() {
  const writes: unknown[] = [];
  const state = {
    busyRef: { current: false }, recoveryReady: true,
    restoredSubjectRef: { current: "언어추리" as string | null }, currentSubject: "언어추리",
    endsAtMs: Date.now() + 60_000, idx: 16, isLast: false, examId: 13, attemptId: 1,
    setIdx: (value: number) => writes.push(["idx", value]),
    setConfirmRequest: (value: unknown) => writes.push(["confirm", value]),
    setBusy: () => {}, setSectionState: () => {}, setNotice: () => {},
    moveToNextSubject: () => writes.push("submit"), clearStoredProgress: () => {},
    flushAnswers: async () => true,
    finishSection: async () => ({ sectionState: {}, finished: false }),
    shouldCleanupOnUnloadRef: { current: true }, router: { replace: () => {} },
    useCallback: (callback: unknown) => callback, URL,
    window: {
      location: { href: "http://localhost/exam/13/take?q=17" },
      history: { replaceState: (...args: unknown[]) => writes.push(["url", ...args]) },
      sessionStorage: {
        setItem: (...args: unknown[]) => writes.push(["storage", ...args]),
        removeItem: () => {},
      },
    },
  };
  const context = { ...state, advance: undefined as unknown as () => void, finish: undefined as unknown as (subject: string) => Promise<void> };
  runInNewContext(transpile(`${advance}\n${finish}\nglobalThis.advance = advanceQuestion; globalThis.finish = handleFinishSection;`), context);
  return { context, writes };
}

test("이전 영역 확인 동작과 시간 종료 후 이동을 차단하고 정상 이동을 유지한다", () => {
  const { context, writes } = setup();
  context.restoredSubjectRef.current = null;
  context.advance();
  context.restoredSubjectRef.current = "수열추리";
  context.advance();
  context.restoredSubjectRef.current = "언어추리";
  context.endsAtMs = Date.now() - 1;
  context.advance();
  context.endsAtMs = Date.now() + 60_000;
  context.busyRef.current = true;
  context.advance();
  assert.deepEqual(writes, []);
  context.busyRef.current = false;
  context.advance();
  assert.ok(writes.some((entry) => JSON.stringify(entry) === '["idx",17]'));
});

test("영역 종료는 답안 저장을 기다리기 전에 확인 창을 닫는다", async () => {
  const { context, writes } = setup();
  let release!: (value: boolean) => void;
  context.flushAnswers = () => new Promise<boolean>((resolve) => { release = resolve; });
  const pending = context.finish("언어추리");
  assert.deepEqual(writes, [["confirm", null]]);
  release(true);
  await pending;
  assert.equal(context.restoredSubjectRef.current, null);
});
