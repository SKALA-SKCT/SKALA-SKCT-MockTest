"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReviewQuestion } from "@/components/ResultReview";
import { loadQuestionNote, saveQuestionNote } from "@/lib/actions/notes";
import { NOTE_TEXT_MAX } from "@/lib/question-note";

type Mode = "text" | "pen" | "eraser";

const SUBJECTS = ["언어이해", "자료해석", "창의수리", "언어추리", "수열추리"];
const AUTOSAVE_DELAY_MS = 1000;
const MODES: Array<[Mode, string]> = [["text", "글"], ["pen", "펜"], ["eraser", "지우개"]];
const SAVE_ERROR = "저장하지 못했습니다. 다시 입력하면 재시도합니다.";

function isCanvasBlank(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const pixels = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
  return !pixels.some((pixel) => pixel !== 0);
}

// 대시보드 "응시 차수" 드롭다운과 같은 모양을 쓴다.
function NoteSelect({ label, value, onChange, children }: { label: string; value: string | number; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <span className="relative block">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-hairline bg-white py-1.5 pl-3 pr-9 text-xs font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
      >
        {children}
      </select>
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3">
        <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function ResultReviewNote({
  questions,
  onSelectQuestion,
}: {
  questions: ReviewQuestion[];
  onSelectQuestion: (question: ReviewQuestion) => void;
}) {
  const questionsBySubject = useMemo(() => {
    const map = new Map<string, ReviewQuestion[]>();
    for (const subject of SUBJECTS) {
      const list = questions.filter((q) => q.subject === subject).sort((a, b) => a.number - b.number);
      if (list.length) map.set(subject, list);
    }
    return map;
  }, [questions]);
  const subjects = [...questionsBySubject.keys()];

  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [localIndex, setLocalIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const subjectQuestions = questionsBySubject.get(subject) ?? [];
  const question = subjectQuestions[localIndex] ?? subjectQuestions[0];
  const questionId = question?.id;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef("");
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentId = useRef<number | undefined>(undefined);
  const loadToken = useRef(0);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const id = currentId.current;
    const canvas = canvasRef.current;
    if (!dirty.current || id === undefined || !canvas) return;
    dirty.current = false;
    // 문항을 바꾸기 전에 현재 캔버스를 동기적으로 캡처한다.
    const payload = {
      questionId: id,
      text: textRef.current,
      drawing: isCanvasBlank(canvas) ? null : canvas.toDataURL("image/png"),
    };
    try {
      const result = await saveQuestionNote(payload);
      if (currentId.current === id) setError(result.ok ? "" : (result.error ?? SAVE_ERROR));
    } catch {
      if (currentId.current === id) {
        dirty.current = true;
        setError(SAVE_ERROR);
      }
    }
  }, []);

  const scheduleSave = () => {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
  };

  // 캔버스 픽셀 크기를 표시 크기에 맞춘다.
  // ponytail: 패널 크기가 바뀌면 다시 맞추지 않음. 창 크기 변경 대응이 필요해지면 ResizeObserver 추가.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
  }, []);

  useEffect(() => {
    if (questionId === undefined) return;
    currentId.current = questionId;
    const token = ++loadToken.current;
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    loadQuestionNote(questionId)
      .then((note) => {
        if (token !== loadToken.current) return;
        textRef.current = note?.text ?? "";
        setText(textRef.current);
        if (!note?.drawing || !canvas) return;
        const image = new Image();
        image.onload = () => {
          if (token !== loadToken.current) return;
          const scale = canvas.width / image.width;
          canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, image.height * scale);
        };
        image.src = note.drawing;
      })
      .catch(() => {});
  }, [questionId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const selectQuestion = (nextSubject: string, nextIndex: number) => {
    void flush();
    textRef.current = "";
    setText("");
    setError("");
    setSubject(nextSubject);
    setLocalIndex(nextIndex);
    const next = questionsBySubject.get(nextSubject)?.[nextIndex];
    if (next) onSelectQuestion(next);
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = e.currentTarget.width / rect.width;
    return { x: (e.clientX - rect.left) * ratio, y: (e.clientY - rect.top) * ratio, ratio };
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
    ctx.globalCompositeOperation = mode === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = (mode === "eraser" ? 14 : 2) * p.ratio;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const onUp = () => {
    if (drawing.current) scheduleSave();
    drawing.current = false;
    last.current = null;
  };

  const clearAll = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    textRef.current = "";
    setText("");
    scheduleSave();
  };

  if (!question) return null;

  return (
    <div className="chart-card flex h-full flex-col overflow-hidden p-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <p className="text-sm font-black text-zinc-900">문항 노트</p>
        <span className="ml-auto text-[11px] font-medium text-brand" aria-live="polite">
          {error}
        </span>
        <div className="group relative">
          <button
            type="button"
            aria-label="노트 사용 안내"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs font-black text-zinc-500 transition hover:border-brand hover:text-brand"
          >
            ?
          </button>
          <div className="pointer-events-none absolute right-0 top-9 z-10 w-72 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs leading-5 text-zinc-500 opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100">
            문항마다 내 풀이와 틀린 이유를 적어둘 수 있습니다. 입력한 내용은 자동으로 저장됩니다.
            <br />
            펜을 고르면 글 위에 그림을 그릴 수 있습니다.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-zinc-100 px-3 py-2">
        <NoteSelect label="영역" value={subject} onChange={(value) => selectQuestion(value, 0)}>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </NoteSelect>
        <NoteSelect label="문제 번호" value={localIndex} onChange={(value) => selectQuestion(subject, Number(value))}>
          {subjectQuestions.map((q, index) => (
            <option key={q.id} value={index}>
              {index + 1}번
            </option>
          ))}
        </NoteSelect>
      </div>

      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-zinc-100 px-2">
        {MODES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={`rounded px-2 py-1 text-[11px] font-medium ${mode === value ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-600"}`}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={clearAll} className="ml-auto px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-600">
          전체 지우기
        </button>
      </div>

      <div className="relative min-h-0 flex-1 bg-white">
        <textarea
          value={text}
          maxLength={NOTE_TEXT_MAX}
          spellCheck={false}
          onChange={(e) => {
            textRef.current = e.target.value;
            setText(e.target.value);
            scheduleSave();
          }}
          className="absolute inset-0 h-full w-full resize-none border-0 bg-transparent px-3 py-2.5 text-sm leading-6 text-zinc-800 outline-none"
        />
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={`absolute inset-0 block h-full w-full touch-none ${mode === "text" ? "pointer-events-none" : mode === "eraser" ? "cursor-cell" : "cursor-crosshair"}`}
        />
      </div>
    </div>
  );
}
