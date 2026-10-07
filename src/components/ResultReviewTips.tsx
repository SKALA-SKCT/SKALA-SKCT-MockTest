"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { loadQuestionTips, createQuestionTip, likeQuestionTip, deleteQuestionTip, reportQuestionTip } from "@/lib/actions/tips";
import { TIP_REPORT_REASONS, type QuestionTip } from "@/lib/question-tip";
import type { ReviewQuestion } from "@/components/ResultReview";

type Tip = QuestionTip;
type Report = { tip: Tip; reason: string; detail: string; createdAt: string };

function TipSelect({ label, value, options, onSelect, disabled }: { disabled?: boolean; label: string; value: string; options: { value: string; label: string }[]; onSelect: (value: string) => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={label} disabled={disabled} className="flex w-full items-center justify-between gap-2 rounded-lg border border-hairline bg-surface py-1.5 pl-3 pr-3 text-xs font-semibold text-ink outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-brand/20">
    {options.find((option) => option.value === value)?.label ?? "선택"}<svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4 text-ink-3"><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border-hairline bg-surface p-1 shadow-[0_14px_32px_rgba(0,0,0,0.14)]">
    {options.map((option) => <DropdownMenuItem key={option.value} onSelect={() => onSelect(option.value)} className={`flex items-center justify-between rounded-lg py-2 text-xs data-[highlighted]:bg-page ${value === option.value ? "font-semibold text-brand" : "text-ink-2"}`}>{option.label}{value === option.value && <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}</DropdownMenuItem>)}
  </DropdownMenuContent></DropdownMenu>;
}

export default function ResultReviewTips({ questions, onSelectQuestion, preview = false }: { preview?: boolean; questions: ReviewQuestion[]; onSelectQuestion: (question: ReviewQuestion) => void }) {
  const [questionId, setQuestionId] = useState(questions[0]?.id);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(!preview);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState("latest");
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [help, setHelp] = useState(false);
  const [message, setMessage] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [admin, setAdmin] = useState(false);
  const [action, setAction] = useState<{ kind: "delete" | "report"; tip: Tip } | null>(null);
  const [reason, setReason] = useState("욕설 또는 비방");
  const [detail, setDetail] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const [tips, setTips] = useState<Tip[]>(() => preview && questions.length ? [
    { id: "sample-1", questionId: questions[0].id, name: "김민서", text: "조건을 하나씩 표로 정리하면 보기와 비교하기 편해요. 먼저 확실한 조건부터 표시해 보세요.", createdAt: "2026-10-07T09:20:00+09:00", likes: 12, liked: false, mine: false, reported: false },
    { id: "sample-2", questionId: questions[0].id, name: "이준호", text: "보기부터 확인하고 필요한 정보만 찾아서 풀었어요. 모든 조건을 계산할 필요가 없었어요.", createdAt: "2026-10-07T10:15:00+09:00", likes: 5, liked: false, mine: false, reported: false },
    { id: "sample-3", questionId: questions[0].id, name: "박민수", text: "헷갈리는 조건에 밑줄을 긋고 마지막에 다시 확인했어요.", createdAt: "2026-10-07T11:00:00+09:00", likes: 2, liked: false, mine: true, reported: false },
  ] : []);
  useEffect(() => {
    if (preview || questionId === undefined) return;
    let cancelled = false;
    startTransition(async () => {
      setLoading(true);
      setLoadError("");
      try {
        const result = await loadQuestionTips(questionId);
        if (cancelled) return;
        if (result.ok) setTips(result.tips);
        else { setTips([]); setLoadError(result.error); }
      } catch { if (!cancelled) { setTips([]); setLoadError("풀이팁을 불러오지 못했어요. 다시 시도해주세요."); } }
      finally { if (!cancelled) setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [preview, questionId]);

  const run = (operation: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) => {
    if (pending || questionId === undefined) return;
    startTransition(async () => {
      setMessage("");
      try {
        const result = await operation();
        if (!result.ok) { setMessage(result.error ?? "처리하지 못했어요. 다시 시도해주세요."); return; }
        after?.();
        setMessage(success);
        const loaded = await loadQuestionTips(questionId);
        if (loaded.ok) { setTips(loaded.tips); setLoadError(""); }
        else setLoadError(loaded.error);
      } catch { setMessage("처리 결과를 확인하지 못했어요. 새로고침 후 확인해주세요."); }
    });
  };

  const subject = questions.find((question) => question.id === questionId)?.subject;
  const subjects = [...new Set(questions.map((question) => question.subject))];
  const selectQuestion = (question: ReviewQuestion) => { if (pending) return; setQuestionId(question.id); setMessage(""); onSelectQuestion(question); };
  const visible = tips.filter((tip) => tip.questionId === questionId).sort((a, b) => sort === "likes" ? b.likes - a.likes || Date.parse(b.createdAt) - Date.parse(a.createdAt) : Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const date = (value: string) => new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  const button = "rounded-lg px-2 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand";
  const openAction = (kind: "delete" | "report", tip: Tip) => { setMessage(""); setAction({ kind, tip }); setReason("욕설 또는 비방"); setDetail(""); dialog.current?.showModal(); };

  return <div className="chart-card flex h-full flex-col overflow-hidden p-0 text-ink">
    <header className="flex shrink-0 items-center justify-between px-4 py-3">
      <h3 className="text-sm font-bold">풀이팁</h3>
      <div className="group relative" onKeyDown={(event) => event.key === "Escape" && setHelp(false)}>
        <button type="button" aria-label="풀이팁 사용 안내" aria-expanded={help} aria-describedby="tips-help" onClick={() => setHelp(!help)} className="flex size-7 items-center justify-center rounded-full text-sm font-bold focus-visible:outline-2 focus-visible:outline-brand"><span className="flex size-7 items-center justify-center rounded-full border border-hairline">?</span></button>
        <div id="tips-help" role="tooltip" className={`absolute right-0 top-9 z-20 w-72 rounded-xl border border-hairline bg-surface p-3 text-xs leading-5 shadow-lg ${help ? "" : "hidden group-hover:block group-focus-within:block"}`}>이 문항의 풀이팁을 서로 공유할 수 있어요.</div>
      </div>
    </header>
    <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-hairline px-3 py-2">
      <TipSelect disabled={pending} label="풀이팁 과목" value={subject ?? ""} options={subjects.map((value) => ({ value, label: value }))} onSelect={(value) => { const question = questions.find((q) => q.subject === value); if (question) selectQuestion(question); }} />
      <TipSelect disabled={pending} label="풀이팁 문항" value={String(questionId)} options={questions.filter((q) => q.subject === subject).map((q, index) => ({ value: String(q.id), label: `${index + 1}번` }))} onSelect={(value) => { const question = questions.find((q) => q.id === Number(value)); if (question) selectQuestion(question); }} />
    </div>
    <div className="flex shrink-0 items-center justify-between px-4 pt-2"><p className="text-xs font-semibold">풀이팁 <span className="ml-1 text-brand">{visible.length}</span></p><div className="flex gap-1">{[["latest", "최신순"], ["likes", "좋아요순"]].map(([value, label]) => <button key={value} type="button" aria-pressed={sort === value} onClick={() => setSort(value)} className={`${button} ${sort === value ? "font-bold text-ink underline decoration-brand decoration-2 underline-offset-8" : "text-ink-2"}`}>{label}</button>)}</div></div>
    <div className={`min-h-0 flex-1 overflow-y-auto px-5 ${!loading && !loadError && visible.length === 0 ? "flex items-center justify-center" : ""}`}>
      {loading && <p className="py-14 text-center text-xs text-ink-2" role="status">풀이팁을 불러오는 중이에요.</p>}
      {loadError && <div className="py-10 text-center"><p className="text-xs text-brand">{loadError}</p><button type="button" disabled={pending} onClick={() => run(async () => ({ ok: true }), "")} className={`${button} mt-2 border border-hairline`}>다시 불러오기</button></div>}
      {!loading && !loadError && visible.length === 0 && <div className="py-14 text-center"><p className="text-sm font-semibold">아직 풀이팁이 없어요.</p><p className="mt-2 text-xs text-ink-2">이 문항의 풀이팁을 공유해주세요.</p></div>}
      <div className="divide-y divide-hairline">{(!loading && !loadError ? visible : []).map((tip) => <article key={tip.id} className="py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-1.5"><b className="text-xs">{tip.name}</b><time dateTime={tip.createdAt} className="text-[11px] tabular-nums text-ink-2">{date(tip.createdAt)}</time>{tip.mine && <span className="text-[11px] text-ink-2">내 글</span>}</div>
          <div className="-mr-2 flex shrink-0 items-center"><button type="button" aria-pressed={tip.liked} aria-label={`좋아요 ${tip.likes}`} disabled={pending} onClick={() => preview ? setTips((current) => current.map((item) => item.id === tip.id ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item)) : run(() => likeQuestionTip(Number(tip.id), !tip.liked), "")} className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs hover:bg-brand/10 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand ${tip.liked ? "text-brand" : "text-ink-2"}`}><svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill={tip.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M7 10H3v11h4V10Zm0 10h11a2 2 0 0 0 2-1.6l1.2-7A2 2 0 0 0 19.2 9H14l.6-4a2.6 2.6 0 0 0-2.5-3L7 10v10Z" /></svg><span className="tabular-nums">{tip.likes}</span></button><button type="button" disabled={pending} onClick={() => openAction(tip.mine ? "delete" : "report", tip)} className={`${button} px-2 font-normal text-ink-2 hover:bg-brand/10 hover:text-brand`}>{tip.mine ? "삭제" : (tip.reported || reports.some((report) => report.tip.id === tip.id)) ? "신고됨" : "신고"}</button></div>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.8] [overflow-wrap:anywhere]">{tip.text}</p>
      </article>)}</div>
    </div>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!text.trim() || questionId === undefined || pending) return;
      const reset = () => { setText(""); if (inputRef.current) inputRef.current.style.height = "24px"; setSort("latest"); };
      if (preview) { setTips((current) => [...current, { id: crypto.randomUUID(), questionId, name: "박민수", text: text.trim(), createdAt: new Date().toISOString(), likes: 0, liked: false, mine: true, reported: false }]); reset(); setMessage("풀이팁을 등록했어요."); }
      else run(() => createQuestionTip(questionId, text), "풀이팁을 등록했어요.", reset);
    }} className="shrink-0 border-t border-hairline bg-surface p-3">
      <div className="rounded-xl border border-hairline bg-page/40 px-3 pb-2 pt-3 focus-within:border-brand/50">
        <textarea aria-label="풀이팁 입력" ref={inputRef} id="tip-text" disabled={pending || Boolean(loadError)} rows={1} value={text} onChange={(event) => { setText(event.target.value); const input = event.currentTarget; input.style.height = "24px"; input.style.height = `${Math.min(input.scrollHeight, 96)}px`; }} maxLength={1000} placeholder="나만의 풀이 방법을 공유해주세요." className="block h-6 max-h-24 w-full resize-none overflow-y-auto border-0 bg-transparent text-[13px] leading-6 outline-none" />
        <div className="flex items-center justify-between"><span className="text-[11px] tabular-nums text-ink-2">{text.length}/1000</span><button disabled={!text.trim() || pending || Boolean(loadError)} className={`${button} bg-ink text-white disabled:opacity-45`}>등록</button></div>
      </div>
      <p role="status" className="mt-2 text-xs text-ink-2">{message}</p>{preview && <button type="button" onClick={() => setAdmin(!admin)} className="mt-1 py-1.5 text-[11px] text-ink-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand">신고 접수 미리보기 {reports.length}건</button>}
    </form>
    <dialog ref={dialog} onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={() => setAction(null)} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface p-6 text-ink shadow-xl backdrop:bg-black/40" aria-labelledby="tip-action-title">
      <h3 id="tip-action-title" className="text-lg font-bold">{action?.kind === "delete" ? "풀이팁 삭제" : "풀이팁 신고"}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-2">{action?.kind === "delete" ? "작성한 풀이팁과 좋아요가 삭제됩니다. 삭제하시겠습니까?" : "신고 사유를 선택해주세요. 접수한 내용은 관리자 신고 목록에 표시됩니다."}</p>
      {action?.kind === "report" && <fieldset className="mt-4 space-y-1"><legend className="sr-only">신고 사유</legend>{TIP_REPORT_REASONS.map((value) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm hover:bg-page"><input type="radio" name="tip-report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="size-4 accent-brand" />{value}</label>)}</fieldset>}
      {action?.kind === "report" && <label className="mt-4 block text-xs font-semibold">상세 내용 <span className="font-normal text-ink-2">(선택)</span><textarea value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={1000} placeholder="신고하는 이유를 구체적으로 적어주세요." className="mt-2 min-h-24 w-full resize-y rounded-lg border border-hairline p-3 text-sm font-normal leading-6 focus-visible:outline-2 focus-visible:outline-brand" /><span className="mt-1 block text-right font-normal tabular-nums text-ink-2">{detail.length}/1000</span></label>}
      {message && <p role="status" className="mt-3 text-xs text-brand">{message}</p>}
      <div className="mt-5 flex justify-end gap-2"><button autoFocus type="button" disabled={pending} onClick={() => dialog.current?.close()} className={`${button} border border-hairline`}>취소</button><button type="button" disabled={pending} onClick={() => { if (!action) return;
        if (!preview) { const operation = action.kind === "delete" ? () => deleteQuestionTip(Number(action.tip.id)) : () => reportQuestionTip(Number(action.tip.id), reason, detail); run(operation, action.kind === "delete" ? "풀이팁을 삭제했어요." : "신고를 접수했어요.", () => dialog.current?.close()); return; }
        if (action.kind === "delete") { setTips((current) => current.filter((tip) => tip.id !== action.tip.id)); setMessage("풀이팁을 삭제했어요."); } else { if (!reports.some((report) => report.tip.id === action.tip.id)) setReports((current) => [...current, { tip: action.tip, reason, detail: detail.trim(), createdAt: new Date().toISOString() }]); setMessage("신고를 접수했어요. 관리자 신고 미리보기에서 확인할 수 있어요."); } dialog.current?.close(); }} className={`${button} border border-brand text-brand`}>{action?.kind === "delete" ? "삭제" : "신고 접수"}</button></div>
    </dialog>
    {preview && admin && <div className="shrink-0 max-h-64 overflow-y-auto border-t border-hairline bg-page p-4"><h3 className="text-sm font-bold">관리자 신고 목록 (로컬 미리보기)</h3>{reports.length === 0 && <p className="mt-3 text-xs text-ink-2">접수된 신고가 없어요.</p>}{reports.map((report) => <article key={report.tip.id} className="mt-3 rounded-lg border border-hairline bg-surface p-3 text-xs"><p className="font-bold">풀이팁 신고, 처리 대기</p><p className="mt-1">작성자 {report.tip.name}, 신고자 박민수</p><p className="mt-1">{report.reason}, {date(report.createdAt)}</p>{report.detail && <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">상세 내용: {report.detail}</p>}<p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{report.tip.text}</p></article>)}</div>}
  </div>;
}
