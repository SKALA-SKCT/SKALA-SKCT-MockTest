"use client";

import { useActionState, useState } from "react";
import {
  checkEmail,
  checkPasswordResetIdentity,
  type AuthFormState,
} from "@/lib/actions/auth";

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
  validationMode = "none",
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: Field[];
  submitLabel: string;
  hidden?: Record<string, string>;
  validationMode?: "none" | "find-id" | "password-reset";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [values, setValues] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [validationMessage, setValidationMessage] = useState("");

  const runValidation = async (nextValues: Record<string, string>) => {
    if (validationMode === "none") return;
    const email = (nextValues.email ?? "").trim();
    const nickname = (nextValues.nickname ?? "").trim();

    if (!email || (validationMode === "password-reset" && !nickname)) {
      setValidationStatus("idle");
      setValidationMessage("");
      return;
    }

    setValidationStatus("checking");
    try {
      if (validationMode === "find-id") {
        const { exists, valid } = await checkEmail(email);
        if (!valid) {
          setValidationStatus("invalid");
          setValidationMessage("이메일을 올바르게 입력해주세요.");
          return;
        }
        setValidationStatus(exists ? "valid" : "invalid");
        setValidationMessage(
          exists
            ? "가입된 이메일입니다."
            : "가입되어 있지 않은 이메일입니다."
        );
        return;
      }

      const { exists, valid } = await checkPasswordResetIdentity({
        nickname,
        email,
      });
      if (!valid) {
        setValidationStatus("invalid");
        setValidationMessage("아이디와 이메일을 올바르게 입력해주세요.");
        return;
      }
      setValidationStatus(exists ? "valid" : "invalid");
      setValidationMessage(
        exists
          ? "아이디와 이메일이 확인되었습니다."
          : "아이디와 이메일이 일치하는 계정을 찾을 수 없습니다."
      );
    } catch {
      setValidationStatus("idle");
      setValidationMessage("");
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    setValidationStatus("idle");
    setValidationMessage("");
  };

  const handleFieldBlur = (name: string, value: string) => {
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    void runValidation(nextValues);
  };

  const submitDisabled =
    pending ||
    validationStatus === "checking" ||
    validationStatus === "invalid";

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
          value={values[field.name] ?? ""}
          onChange={(event) =>
            handleFieldChange(field.name, event.target.value)
          }
          onBlur={(event) => handleFieldBlur(field.name, event.target.value)}
          className={`rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-red-500 ${
            validationStatus === "invalid" &&
            (field.name === "email" || field.name === "nickname")
              ? "border-red-400"
              : "border-zinc-300"
          }`}
        />
      ))}
      {validationStatus === "checking" && (
        <p className="text-xs text-zinc-400">가입 정보 확인 중...</p>
      )}
      {validationStatus === "valid" && validationMessage && (
        <p className="text-xs text-emerald-600">{validationMessage}</p>
      )}
      {validationStatus === "invalid" && validationMessage && (
        <p className="text-xs text-red-600">{validationMessage}</p>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.message && (
        <p className="text-sm text-emerald-700">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={submitDisabled}
        className="rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "처리 중..." : submitLabel}
      </button>
    </form>
  );
}
