"use client";

import { useActionState, useState } from "react";
import { updateUserInfo, type UserInfoState } from "@/lib/actions/admin";

type AccountInfoFormProps = {
  user: {
    id: number;
    name: string;
    nickname: string;
    email: string | null;
    emailVerified: boolean;
    isAdmin: boolean;
  };
  // 본인 계정이면서 관리자일 때는 자기 권한을 회수할 수 없어 토글을 잠근다.
  lockAdminToggle: boolean;
};

const initialState: UserInfoState = { ok: false };

export default function AccountInfoForm({
  user,
  lockAdminToggle,
}: AccountInfoFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateUserInfo,
    initialState
  );

  // controlled 입력: 저장(form action) 후 값이 defaultValue로 리셋되는 문제를 막고,
  // dirty 추적과 관리자 토글 상태를 한곳에서 관리한다.
  const [name, setName] = useState(user.name);
  const [nickname, setNickname] = useState(user.nickname);
  const [email, setEmail] = useState(user.email ?? "");
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);

  // 원본(서버 최신값)과 다를 때만 저장 버튼 활성화.
  // 저장 성공 시 revalidate로 user prop이 갱신되면 자동으로 다시 비활성화된다.
  const dirty =
    name !== user.name ||
    nickname !== user.nickname ||
    email !== (user.email ?? "") ||
    isAdmin !== user.isAdmin;

  return (
    <section className="flex h-full min-h-full flex-col">
      <form
        id="update-user-info"
        action={formAction}
        className="grid gap-2.5"
      >
        <input type="hidden" name="userId" value={user.id} />
        <input
          type="hidden"
          name="emailVerified"
          value={user.emailVerified ? "true" : "false"}
        />
        <input type="hidden" name="isAdmin" value={isAdmin ? "true" : "false"} />
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-3">
            이름
          </span>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-3">
            아이디
          </span>
          <input
            name="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-3">
            이메일
          </span>
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 없음"
            className="h-10 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink outline-none transition focus:border-brand"
          />
        </label>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-ink">관리자 권한</span>
        <button
          type="button"
          onClick={() => {
            if (!lockAdminToggle) setIsAdmin((prev) => !prev);
          }}
          disabled={lockAdminToggle}
          role="switch"
          aria-checked={isAdmin}
          aria-label={isAdmin ? "관리자 권한 회수" : "관리자 권한 부여"}
          title={isAdmin ? "관리자 권한 회수" : "관리자 권한 부여"}
          className={`relative h-8 w-14 shrink-0 rounded-full p-1 transition ${
            isAdmin ? "bg-brand" : "bg-zinc-200"
          } ${
            lockAdminToggle ? "cursor-not-allowed opacity-60" : "hover:opacity-90"
          }`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              isAdmin ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="mt-auto pt-4">
        {state.error ? (
          <p className="mb-2 text-xs font-semibold text-brand">{state.error}</p>
        ) : state.ok ? (
          <p className="mb-2 text-xs font-semibold text-emerald-600">
            저장되었습니다.
          </p>
        ) : null}
        <button
          type="submit"
          form="update-user-info"
          disabled={!dirty || isPending}
          className="h-10 w-full rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink"
        >
          {isPending ? "저장 중…" : "정보 저장"}
        </button>
      </div>
    </section>
  );
}
