"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

function calculate(source: string) {
  const tokens = source.match(/\d+(?:\.\d+)?|[()+\-×÷]/g) ?? [];
  if (tokens.join("") !== source || tokens.length === 0) throw new Error("invalid");

  let index = 0;
  const expression = (): number => {
    let value = term();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = term();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const term = (): number => {
    let value = factor();
    while (tokens[index] === "×" || tokens[index] === "÷") {
      const operator = tokens[index++];
      const right = factor();
      value = operator === "×" ? value * right : value / right;
    }
    return value;
  };
  const factor = (): number => {
    if (tokens[index] === "-") {
      index += 1;
      return -factor();
    }
    if (tokens[index] === "(") {
      index += 1;
      const value = expression();
      if (tokens[index++] !== ")") throw new Error("invalid");
      return value;
    }
    const value = Number(tokens[index++]);
    if (!Number.isFinite(value)) throw new Error("invalid");
    return value;
  };

  const result = expression();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error("invalid");
  return Math.round(result * 1e8) / 1e8;
}

export default function Calculator() {
  const [expression, setExpression] = useState("0");
  const [history, setHistory] = useState<string[]>([]);
  const [justCalculated, setJustCalculated] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const display = displayRef.current;
    if (display) display.scrollLeft = display.scrollWidth;
  }, [expression]);

  const input = useCallback(
    (value: string) => {
      setExpression((current) => {
        const isDigit = /^\d$/.test(value);
        if (current === "오류" || (justCalculated && (isDigit || value === "." || value === "("))) {
          return value === "." ? "0." : value;
        }
        if (isDigit && current === "0") return value;
        if (value === "." && /(?:^|[+\-×÷(])\d*$/.test(current)) {
          return current + "0.";
        }
        if (value === "." && current.split(/[+\-×÷()]/).at(-1)?.includes(".")) return current;
        if (/^[+\-×÷]$/.test(value) && /[+\-×÷]$/.test(current)) {
          return current.slice(0, -1) + value;
        }
        return current + value;
      });
      setJustCalculated(false);
    },
    [justCalculated]
  );

  const addParenthesis = useCallback(() => {
    setExpression((current) => {
      if (current === "0" || current === "오류" || justCalculated) return "(";
      const opens = (current.match(/\(/g) ?? []).length;
      const closes = (current.match(/\)/g) ?? []).length;
      const shouldClose = opens > closes && /[\d)]$/.test(current);
      return current + (shouldClose ? ")" : "(");
    });
    setJustCalculated(false);
  }, [justCalculated]);

  const equals = useCallback(() => {
    setExpression((current) => {
      try {
        const result = String(calculate(current));
        setHistory((items) => [`${current} = ${result}`, ...items].slice(0, 2));
        return result;
      } catch {
        return "오류";
      }
    });
    setJustCalculated(true);
  }, []);

  const clear = useCallback(() => {
    setExpression("0");
    setJustCalculated(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;

      const mapped =
        event.key === "*" ? "×" : event.key === "/" ? "÷" : event.key;
      if (/^\d$/.test(mapped) || [".", "+", "-", "×", "÷", "("].includes(mapped)) {
        event.preventDefault();
        input(mapped);
      } else if (mapped === ")") {
        event.preventDefault();
        input(")");
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
      <div className="grid grid-cols-4 gap-1.5">
        <CalcButton label="C" onClick={clear} className="bg-zinc-200 text-zinc-700" />
        <CalcButton label="( )" onClick={addParenthesis} className="bg-zinc-100" />
        <CalcButton label="÷" onClick={() => input("÷")} className="bg-zinc-100" />
        <CalcButton label="×" onClick={() => input("×")} className="bg-zinc-100" />
        {["7", "8", "9"].map((digit) => (
          <CalcButton key={digit} label={digit} onClick={() => input(digit)} className="border border-zinc-200 bg-white" />
        ))}
        <CalcButton label="−" onClick={() => input("-")} className="bg-zinc-100" />
        {["4", "5", "6"].map((digit) => (
          <CalcButton key={digit} label={digit} onClick={() => input(digit)} className="border border-zinc-200 bg-white" />
        ))}
        <CalcButton label="+" onClick={() => input("+")} className="bg-zinc-100" />
        {["1", "2", "3"].map((digit) => (
          <CalcButton key={digit} label={digit} onClick={() => input(digit)} className="border border-zinc-200 bg-white" />
        ))}
        <CalcButton label="=" onClick={equals} className="row-span-2 h-full bg-brand text-white" />
        <CalcButton label="0" onClick={() => input("0")} className="col-span-2 border border-zinc-200 bg-white" />
        <CalcButton label="." onClick={() => input(".")} className="border border-zinc-200 bg-white" />
      </div>
    </div>
  );
}
