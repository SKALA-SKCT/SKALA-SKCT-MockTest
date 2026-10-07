export type PendingAnswer = { choice: number | null };

export function restorePendingAnswers(raw: string | null, choices: Map<number, number>) {
  const pending = new Map<number, PendingAnswer>();
  if (!raw) return pending;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return pending;
    for (const [key, value] of Object.entries(parsed)) {
      const id = Number(key);
      const count = choices.get(id);
      if (count && (value === null || (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= count))) {
        pending.set(id, { choice: value as number | null });
      }
    }
  } catch { /* 손상된 보관 데이터는 서버 답안으로 복원한다. */ }
  return pending;
}

export async function flushPendingAnswers(
  pending: Map<number, PendingAnswer>,
  save: (id: number, choice: number | null) => Promise<boolean>,
  onSaved: () => void,
) {
  while (pending.size) {
    const [id, answer] = pending.entries().next().value!;
    try { if (!await save(id, answer.choice)) return false; } catch { return false; }
    if (pending.get(id) === answer) pending.delete(id);
    onSaved();
  }
  return true;
}

export function resumeQuestionIndex(questionIds: number[], openedQuestionIds: number[]): number {
  const opened = new Set(openedQuestionIds);
  return Math.max(0, questionIds.findLastIndex((id) => opened.has(id)));
}
