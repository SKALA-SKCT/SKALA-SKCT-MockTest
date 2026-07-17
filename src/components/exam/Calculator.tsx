"use client";

import { useState } from "react";

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
      className={`rounded-md py-1.5 text-sm font-medium transition hover:brightness-95 ${className}`}
    >
      {label}
    </button>
  );
}

export default function Calculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const apply = (a: number, b: number, o: string) => {
    switch (o) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
      default: return b;
    }
  };

  const fmt = (n: number) =>
    Number.isNaN(n) ? "오류" : String(Math.round(n * 1e8) / 1e8);

  const digit = (d: string) => {
    setDisplay((v) => {
      if (fresh || v === "0") return d === "." ? "0." : d;
      if (d === "." && v.includes(".")) return v;
      return v.length >= 12 ? v : v + d;
    });
    setFresh(false);
  };

  const operate = (o: string) => {
    const cur = parseFloat(display);
    if (prev != null && op && !fresh) {
      const r = apply(prev, cur, op);
      setDisplay(fmt(r));
      setPrev(r);
    } else {
      setPrev(cur);
    }
    setOp(o);
    setFresh(true);
  };

  const equals = () => {
    if (prev == null || op == null) return;
    const r = apply(prev, parseFloat(display), op);
    setDisplay(fmt(r));
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  return (
    <div className="rounded-lg border border-zinc-200 p-2">
      <div className="mb-2 rounded-md bg-zinc-50 px-2 py-1.5 text-right font-mono text-lg font-semibold tabular-nums">
        {display}
        {op && <span className="ml-1 text-xs text-red-500">{op}</span>}
      </div>
      <div className="grid grid-cols-4 gap-1">
        <CalcButton label="C" onClick={clear} className="bg-zinc-200 text-zinc-700" />
        <CalcButton label="÷" onClick={() => operate("÷")} className="bg-zinc-100" />
        <CalcButton label="×" onClick={() => operate("×")} className="bg-zinc-100" />
        <CalcButton label="−" onClick={() => operate("−")} className="bg-zinc-100" />
        {["7", "8", "9"].map((d) => (
          <CalcButton key={d} label={d} onClick={() => digit(d)} className="bg-white border border-zinc-200" />
        ))}
        <CalcButton label="+" onClick={() => operate("+")} className="bg-zinc-100" />
        {["4", "5", "6"].map((d) => (
          <CalcButton key={d} label={d} onClick={() => digit(d)} className="bg-white border border-zinc-200" />
        ))}
        <CalcButton label="=" onClick={equals} className="row-span-3 h-full bg-red-600 text-white" />
        {["1", "2", "3"].map((d) => (
          <CalcButton key={d} label={d} onClick={() => digit(d)} className="bg-white border border-zinc-200" />
        ))}
        <CalcButton label="0" onClick={() => digit("0")} className="col-span-2 bg-white border border-zinc-200" />
        <CalcButton label="." onClick={() => digit(".")} className="bg-white border border-zinc-200" />
      </div>
    </div>
  );
}
