"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { deleteAccountWithNickname, logoutOnly } from "@/lib/actions/auth";
import { getMotherLogoutUrl } from "@/lib/mother-auth";

export default function AccountMenu({
  nickname,
  name,
}: {
  nickname: string;
  name: string;
}) {
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmNickname, setConfirmNickname] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    await logoutOnly();
    window.location.href = getMotherLogoutUrl();
  };

  const openDeleteModal = () => {
    if (busy) return;
    setMenuOpen(false);
    setConfirmNickname("");
    setDeleteError("");
    setDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    if (busy) return;
    setDeleteOpen(false);
    setConfirmNickname("");
    setDeleteError("");
  };

  const handleDeleteAccount = async () => {
    if (busy) return;
    if (confirmNickname.trim() !== nickname) {
      setDeleteError("아이디를 정확히 입력해주세요.");
      return;
    }
    setBusy(true);
    const result = await deleteAccountWithNickname(confirmNickname);
    if (result.ok) {
      window.location.href = getMotherLogoutUrl();
      return;
    }
    setDeleteError(result.error ?? "회원탈퇴에 실패했습니다.");
    setBusy(false);
  };

  const deleteDialog =
    typeof document !== "undefined" && deleteOpen
      ? createPortal(
          <div
            role="presentation"
            className="fixed inset-0 z-[1000] grid place-items-center bg-zinc-950/45 px-4 py-8 backdrop-blur-[1px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeDeleteModal();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              className="w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="space-y-2">
                <p
                  id="delete-account-title"
                  className="text-xl font-bold text-zinc-950"
                >
                  회원탈퇴
                </p>
                <p className="text-sm leading-6 text-zinc-500">
                  탈퇴하면 계정과 모든 응시 기록이 삭제됩니다. 계속하려면
                  아래에 아이디를 정확히 입력해주세요.
                </p>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="delete-confirm-nickname"
                  className="text-xs font-semibold text-zinc-500"
                >
                  아이디
                </label>
                <input
                  id="delete-confirm-nickname"
                  value={confirmNickname}
                  onChange={(event) => {
                    setConfirmNickname(event.target.value);
                    setDeleteError("");
                  }}
                  placeholder={nickname}
                  autoComplete="off"
                  disabled={busy}
                  autoFocus
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-red-500 disabled:bg-zinc-50 disabled:text-zinc-400"
                />
                {deleteError && (
                  <p className="mt-2 text-xs text-red-600">{deleteError}</p>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={busy}
                  className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={busy || confirmNickname.trim() !== nickname}
                  className="rounded-[10px] bg-ink px-[18px] py-2.5 text-sm font-medium text-white transition hover:bg-brand hover:-translate-y-px disabled:opacity-50"
                >
                  {busy ? "탈퇴 중..." : "회원탈퇴"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className="relative"
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-page focus:outline-none focus-visible:outline-none focus-visible:ring-0"
        >
          {name}님
        </button>
        <div
          className={`absolute right-0 top-full z-[70] min-w-36 pt-2 text-sm transition ${
            menuOpen
              ? "visible translate-y-0 opacity-100"
              : "invisible -translate-y-1 opacity-0"
          }`}
          role="menu"
        >
          <div className="rounded-xl border border-black/10 bg-white p-1 shadow-[0_14px_32px_rgba(0,0,0,0.14)]">
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              className="block w-full rounded-lg px-3 py-2 text-left text-ink-2 outline-none hover:bg-black/[0.04]"
            >
              로그아웃
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={openDeleteModal}
              className="block w-full rounded-lg px-3 py-2 text-left text-red-600 outline-none hover:bg-red-50"
            >
              회원탈퇴
            </button>
          </div>
        </div>
      </div>
      {deleteDialog}
    </>
  );
}
