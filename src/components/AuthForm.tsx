"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkNickname, type AuthFormState } from "@/lib/actions/auth";

export default function AuthForm({
  action,
  title,
  submitLabel,
  altHref,
  altLabel,
  isRegister = false,
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  title: string;
  submitLabel: string;
  altHref: string;
  altLabel: string;
  isRegister?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {});
  const [nickStatus, setNickStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const pinMismatch =
    isRegister && pinConfirm.length > 0 && pin !== pinConfirm;

  const onNicknameBlur = async (value: string) => {
    if (!isRegister || !value.trim()) {
      setNickStatus("idle");
      return;
    }
    setNickStatus("checking");
    try {
      const { available } = await checkNickname(value);
      setNickStatus(available ? "available" : "taken");
    } catch {
      setNickStatus("idle");
    }
  };

  return (
    <div className="relative mx-auto mt-24 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      {isRegister && (
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-4 top-4 rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          ← 뒤로가기
        </button>
      )}
      <h1 className="mb-1 mt-2 text-center text-2xl font-bold text-zinc-900">
        SKCT 스터디
      </h1>
      <p className="mb-6 text-center text-sm text-zinc-500">{title}</p>
      <form action={formAction} className="flex flex-col gap-3">
        <div>
          <input
            name="nickname"
            placeholder="아이디"
            maxLength={12}
            required
            onBlur={(e) => onNicknameBlur(e.target.value)}
            onChange={() => setNickStatus("idle")}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-red-500 ${
              nickStatus === "taken" ? "border-red-400" : "border-zinc-300"
            }`}
          />
          {isRegister && nickStatus === "checking" && (
            <p className="mt-1 text-xs text-zinc-400">중복 확인 중...</p>
          )}
          {isRegister && nickStatus === "available" && (
            <p className="mt-1 text-xs text-emerald-600">
              사용 가능한 아이디입니다.
            </p>
          )}
          {isRegister && nickStatus === "taken" && (
            <p className="mt-1 text-xs text-red-600">
              이미 사용 중인 아이디입니다.
            </p>
          )}
        </div>
        {isRegister && (
          <input
            name="email"
            type="email"
            placeholder="이메일"
            autoComplete="email"
            required
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-red-500"
          />
        )}
        <input
          name="pin"
          type="password"
          placeholder="비밀번호"
          minLength={6}
          maxLength={32}
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-red-500"
        />
        {isRegister && (
          <div>
            <input
              name="pinConfirm"
              type="password"
              placeholder="비밀번호 확인"
              minLength={6}
              maxLength={32}
              autoComplete="new-password"
              required
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-red-500 ${
                pinMismatch ? "border-red-400" : "border-zinc-300"
              }`}
            />
            {pinMismatch && (
              <p className="mt-1 text-xs text-red-600">
                비밀번호가 서로 일치하지 않습니다.
              </p>
            )}
          </div>
        )}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.message && (
          <p className="text-sm text-emerald-700">{state.message}</p>
        )}
        <button
          type="submit"
          disabled={pending || pinMismatch || nickStatus === "taken"}
          className="mt-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "처리 중..." : submitLabel}
        </button>
      </form>
      {!isRegister && (
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-zinc-500">
          <Link href="/find-id" className="hover:text-red-600 hover:underline">
            아이디 찾기
          </Link>
          <span className="text-zinc-300">|</span>
          <Link
            href="/forgot-password"
            className="hover:text-red-600 hover:underline"
          >
            비밀번호 찾기
          </Link>
        </div>
      )}
      <p className="mt-3 text-center text-sm text-zinc-500">
        <Link href={altHref} className="text-red-600 hover:underline">
          {altLabel}
        </Link>
      </p>
    </div>
  );
}
