"use client";

import { useActionState, useEffect } from "react";
import {
  deleteAttemptRecord,
  type AdminActionState,
} from "@/lib/actions/admin";

const initialState: AdminActionState = {};

export default function AttemptDeleteForm({ attemptId }: { attemptId: number }) {
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
        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-brand transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "삭제 중…" : "삭제"}
      </button>
    </form>
  );
}
