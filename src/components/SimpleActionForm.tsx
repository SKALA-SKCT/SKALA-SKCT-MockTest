"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/lib/actions/auth";

type Field = {
  name: string;
  type?: string;
  placeholder: string;
  autoComplete?: string;
};

export default function SimpleActionForm({
  action,
  fields,
  submitLabel,
  hidden,
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: Field[];
  submitLabel: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-5 flex flex-col gap-3">
      {hidden &&
        Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {fields.map((field) => (
        <input
          key={field.name}
          name={field.name}
          type={field.type ?? "text"}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          required
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-red-500"
        />
      ))}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.message && (
        <p className="text-sm text-emerald-700">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "처리 중..." : submitLabel}
      </button>
    </form>
  );
}
