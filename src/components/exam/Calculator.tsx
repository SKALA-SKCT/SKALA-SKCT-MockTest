"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appendCalculatorInput, finishCalculation, startNextCalculation } from "./calculatorLogic";

function CalcButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md py-2 text-sm font-medium transition hover:brightness-95 ${className}`}
    >
      {label}
    </button>
  );
}

export default function Calculator() {
  const [expression, setExpression] = useState("0");
  const [history, setHistory] = useState<string[]>([]);
  const [justCalculated, setJustCalculated] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<string | null>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const display = displayRef.current;
    if (display) display.scrollLeft = display.scrollWidth;
  }, [expression]);

  const input = useCallback(
    (value: string) => {
      if (justCalculated) {
        const next = startNextCalculation(
          { expression, history, pendingRecord, calculated: true },
          value
        );
        setExpression(next.expression);
        setHistory(next.history);
        setPendingRecord(null);
      } else {
        setExpression(appendCalculatorInput(expression, value, false));
      }
      setJustCalculated(false);
    },
    [expression, history, justCalculated, pendingRecord]
  );

  const equals = useCallback(() => {
    if (justCalculated) return;
    try {
      const finished = finishCalculation(expression, history);
      setExpression(finished.expression);
      setPendingRecord(finished.pendingRecord);
    } catch {
      setExpression("오류");
      setPendingRecord(null);
    }
    setJustCalculated(true);
  }, [expression, history, justCalculated]);

  const clear = useCallback(() => {
    setExpression("0");
    setJustCalculated(false);
    setPendingRecord(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;

      const mapped =
        event.key === "*" ? "×" : event.key === "/" ? "÷" : event.key;
      if (/^\d$/.test(mapped) || [".", "+", "-", "×", "÷", "(", ")", "%"].includes(mapped)) {
        event.preventDefault();
        input(mapped);
      } else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        equals();
      } else if (event.key === "Escape") {
        clear();
      } else if (event.key === "Backspace") {
        event.preventDefault();
        setExpression((current) => (current.length > 1 ? current.slice(0, -1) : "0"));
        setJustCalculated(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clear, equals, input]);

  return (
    <div className="rounded-lg border border-zinc-200 p-2.5">
      <div className="mb-2 min-h-11 rounded-md bg-zinc-50 px-2.5 py-1.5 text-right">
        {history.length ? (
          history.map((item) => (
            <p key={item} className="truncate font-mono text-[11px] leading-4 text-zinc-400">
              {item}
            </p>
          ))
        ) : (
          <p className="text-[11px] leading-4 text-zinc-300">최근 계산 기록</p>
        )}
      </div>
      <div
        ref={displayRef}
        className="mb-2 min-h-12 overflow-x-auto whitespace-nowrap rounded-md bg-zinc-50 px-2.5 py-2 text-right font-mono text-xl font-semibold tabular-nums"
        aria-label="계산식"
      >
        {expression}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        <CalcButton label="C" onClick={clear} className="col-span-3 bg-zinc-100" />
        <CalcButton label="(" onClick={() => input("(")} className="bg-zinc-100" />
        <CalcButton label=")" onClick={() => input(")")} className="bg-zinc-100" />
        {["7", "8", "9"].map((digit) => (
          <CalcButton key={digit} label={digit} onClick={() => input(digit)} className="border border-zinc-200 bg-white" />
        ))}
        <CalcButton label="÷" onClick={() => input("÷")} className="bg-zinc-100" />
        <CalcButton label="×" onClick={() => input("×")} className="bg-zinc-100" />
        {["4", "5", "6"].map((digit) => (
          <CalcButton key={digit} label={digit} onClick={() => input(digit)} className="border border-zinc-200 bg-white" />
        ))}
        <CalcButton label="−" onClick={() => input("-")} className="bg-zinc-100" />
        <CalcButton label="+" onClick={() => input("+")} className="bg-zinc-100" />
        {["1", "2", "3"].map((digit) => (
          <CalcButton key={digit} label={digit} onClick={() => input(digit)} className="border border-zinc-200 bg-white" />
        ))}
        <CalcButton label="%" onClick={() => input("%")} className="bg-zinc-100" />
        <CalcButton
          label="="
          onClick={equals}
          className="row-span-2 h-full bg-brand text-white"
        />
        <CalcButton
          label="0"
          onClick={() => input("0")}
          className="col-span-3 border border-zinc-200 bg-white"
        />
        <CalcButton label="." onClick={() => input(".")} className="border border-zinc-200 bg-white" />
      </div>
    </div>
  );
}
