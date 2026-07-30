"use client";

import { useEffect, useRef, useState } from "react";

function MemoTextarea() {
  const [memo, setMemo] = useState("");

  return (
    <textarea
      value={memo}
      onChange={(e) => setMemo(e.target.value)}
      placeholder="다음 문제로 넘어가면 지워집니다"
      className="block h-full w-full resize-none border-0 px-3 py-2.5 text-sm outline-none"
    />
  );
}

/** 메모장/그림판 — 실제 시험처럼 문제가 바뀌면 자동으로 지워진다 */
export default function MemoPad({ resetKey }: { resetKey: number | string }) {
  const [tab, setTab] = useState<"memo" | "draw">("memo");
  const [memoReset, setMemoReset] = useState(0);
  const [drawTool, setDrawTool] = useState<"pen" | "eraser">("pen");
  const [lineWidth, setLineWidth] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
  };

  // 캔버스 실제 픽셀 크기를 표시 크기에 맞춤
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    c.width = rect.width;
    c.height = rect.height;
  }, [tab, resetKey]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    last.current = pos(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.globalCompositeOperation = drawTool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = drawTool === "eraser" ? Math.max(lineWidth * 2, 8) : lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  return (
    <div className="rounded-lg border border-zinc-200">
      <div className="flex items-center border-b border-zinc-100 px-2">
        <button
          type="button"
          onClick={() => setTab("memo")}
          className={`px-2 py-1.5 text-xs font-semibold ${
            tab === "memo" ? "text-red-600" : "text-zinc-400"
          }`}
        >
          메모장
        </button>
        <button
          type="button"
          onClick={() => setTab("draw")}
          className={`px-2 py-1.5 text-xs font-semibold ${
            tab === "draw" ? "text-red-600" : "text-zinc-400"
          }`}
        >
          그림판
        </button>
        {tab === "draw" && (
          <div className="ml-1 flex items-center gap-1 border-l border-zinc-100 pl-2">
            <button
              type="button"
              onClick={() => setDrawTool("pen")}
              aria-pressed={drawTool === "pen"}
              className={`rounded px-1.5 py-1 text-[11px] font-medium ${
                drawTool === "pen" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              펜
            </button>
            <button
              type="button"
              onClick={() => setDrawTool("eraser")}
              aria-pressed={drawTool === "eraser"}
              className={`rounded px-1.5 py-1 text-[11px] font-medium ${
                drawTool === "eraser" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              지우개
            </button>
            <label className="flex items-center gap-1 text-[10px] text-zinc-400">
              굵기
              <input
                type="range"
                min="1"
                max="12"
                value={lineWidth}
                onChange={(event) => setLineWidth(Number(event.target.value))}
                className="h-1 w-12 accent-zinc-800"
                aria-label="펜 굵기"
              />
            </label>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (tab === "memo") setMemoReset((v) => v + 1);
            if (tab === "draw") clearCanvas();
          }}
          className="ml-auto px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-600"
        >
          전체 지우기
        </button>
      </div>
      <div className="h-44 overflow-hidden rounded-b-lg">
        {tab === "memo" ? (
          <MemoTextarea key={`${resetKey}:${memoReset}`} />
        ) : (
          <canvas
            key={resetKey}
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            className="block h-full w-full touch-none"
          />
        )}
      </div>
    </div>
  );
}
