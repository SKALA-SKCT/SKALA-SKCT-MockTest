"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  checkEmail,
  checkNickname,
  requestRegistrationEmailCode,
  type AuthFormState,
} from "@/lib/actions/auth";

const CAMPUS_OPTIONS = ["판교", "울산", "광주"] as const;
const classOptionsForCampus = (campus: string) =>
  Array.from({ length: campus === "판교" ? 10 : 4 }, (_, i) => i + 1);

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
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [campus, setCampus] = useState<(typeof CAMPUS_OPTIONS)[number]>("판교");
  const [classNumber, setClassNumber] = useState(1);
  const [email, setEmail] = useState("");
  const [emailCodeStatus, setEmailCodeStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [emailCodeMessage, setEmailCodeMessage] = useState("");
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

  const onEmailBlur = async (value: string) => {
    const email = value.trim();
    if (!isRegister || !email) {
      setEmailStatus("idle");
      return;
    }
    setEmailStatus("checking");
    try {
      const { exists, valid } = await checkEmail(email);
      if (!valid) {
        setEmailStatus("invalid");
        return;
      }
      setEmailStatus(exists ? "taken" : "available");
    } catch {
      setEmailStatus("idle");
    }
  };

  const requestEmailCode = async () => {
    const trimmed = email.trim();
    setEmailCodeMessage("");
    if (!trimmed) {
      setEmailCodeStatus("error");
      setEmailCodeMessage("이메일을 먼저 입력해주세요.");
      return;
    }
    setEmailCodeStatus("sending");
    try {
      const result = await requestRegistrationEmailCode(trimmed);
      if (result.ok) {
        setEmailCodeStatus("sent");
        setEmailCodeMessage(result.message ?? "인증번호를 보냈습니다.");
        return;
      }
      setEmailCodeStatus("error");
      setEmailCodeMessage(result.error ?? "인증번호 발송에 실패했습니다.");
    } catch {
      setEmailCodeStatus("error");
      setEmailCodeMessage("인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div
      className={
        isRegister
          ? ""
          : "flex min-h-[calc(100vh-10rem)] items-center justify-center"
      }
    >
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
        SKCT 모의고사
      </h1>
      <p className="mb-6 text-center text-sm text-zinc-500">{title}</p>
      <form action={formAction} className="flex flex-col gap-3">
        {isRegister && (
          <input
            name="name"
            placeholder="이름"
            maxLength={20}
            autoComplete="name"
            required
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-red-500"
          />
        )}
        {isRegister && (
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <select
              name="campus"
              value={campus}
              onChange={(event) => {
                setCampus(event.target.value as (typeof CAMPUS_OPTIONS)[number]);
                setClassNumber(1);
              }}
              required
              className="select-control rounded-lg border border-zinc-300 py-2.5 pl-4 text-sm outline-none focus:border-red-500"
            >
              {CAMPUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              name="classNumber"
              value={classNumber}
              onChange={(event) => setClassNumber(Number(event.target.value))}
              required
              className="select-control rounded-lg border border-zinc-300 py-2.5 pl-3 text-sm outline-none focus:border-red-500"
            >
              {classOptionsForCampus(campus).map((classNumber) => (
                <option key={classNumber} value={classNumber}>
                  {classNumber}반
                </option>
              ))}
            </select>
          </div>
        )}
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
          <div>
            <input
              name="email"
              type="email"
              placeholder="이메일"
              autoComplete="email"
              required
              value={email}
              onBlur={(e) => onEmailBlur(e.target.value)}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailStatus("idle");
                setEmailCodeStatus("idle");
                setEmailCodeMessage("");
              }}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-red-500 ${
                emailStatus === "taken" || emailStatus === "invalid"
                  ? "border-red-400"
                  : "border-zinc-300"
              }`}
            />
            {emailStatus === "checking" && (
              <p className="mt-1 text-xs text-zinc-400">이메일 확인 중...</p>
            )}
            {emailStatus === "available" && (
              <p className="mt-1 text-xs text-emerald-600">
                가입 가능한 이메일입니다.
              </p>
            )}
            {emailStatus === "taken" && (
              <p className="mt-1 text-xs text-red-600">
                이미 가입된 이메일입니다.
              </p>
            )}
            {emailStatus === "invalid" && (
              <p className="mt-1 text-xs text-red-600">
                이메일을 올바르게 입력해주세요.
              </p>
            )}
            <div className="mt-2 grid grid-cols-[1fr_112px] gap-2">
              <input
                name="emailCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="인증번호 6자리"
                required
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => void requestEmailCode()}
                disabled={
                  emailCodeStatus === "sending" ||
                  emailStatus === "taken" ||
                  emailStatus === "invalid"
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                {emailCodeStatus === "sending" ? "발송 중" : "인증번호"}
              </button>
            </div>
            {emailCodeMessage && (
              <p
                className={`mt-1 text-xs ${
                  emailCodeStatus === "sent" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {emailCodeMessage}
              </p>
            )}
          </div>
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
          disabled={
            pending ||
            pinMismatch ||
            nickStatus === "taken" ||
            emailStatus === "taken" ||
            emailStatus === "invalid"
          }
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
    </div>
  );
}
