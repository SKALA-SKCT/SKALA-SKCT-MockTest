"use client";

import { useActionState, useEffect } from "react";
import {
  deleteAttemptRecord,
  type AdminActionState,
} from "@/lib/actions/admin";

const initialState: AdminActionState = {};

export default function AttemptDeleteForm({
  attemptId,
  compact = false,
}: {
  attemptId: number;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    deleteAttemptRecord,
    initialState
  );

  useEffect(() => {
    if (state.error) {
      window.alert(state.error);
    } else if (state.ok && state.message) {
      window.alert(state.message);
    }
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("이 응시 기록을 삭제할까요?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="attemptId" value={attemptId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`${attemptId}번 응시 기록 삭제`}
        className={`rounded-md border border-red-200 bg-red-50 font-bold text-brand transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 ${
          compact ? "h-6 px-1.5 text-[10px]" : "px-2.5 py-1.5 text-xs"
        }`}
      >
        {pending ? "삭제 중…" : "삭제"}
      </button>
    </form>
  );
}
