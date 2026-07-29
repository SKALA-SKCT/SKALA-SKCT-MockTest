"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteAccountWithNickname,
  logoutOnly,
  updateMyProfile,
} from "@/lib/actions/auth";

const CAMPUSES = ["판교", "울산", "광주"] as const;
type Campus = (typeof CAMPUSES)[number];
const maxClassForCampus = (campus: Campus) => (campus === "판교" ? 10 : 4);

export default function AccountMenu({
  nickname,
  name,
  campus,
  classNumber,
}: {
  nickname: string;
  name: string;
  campus: Campus;
  classNumber: number;
}) {
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmNickname, setConfirmNickname] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [profileCampus, setProfileCampus] = useState<Campus>(campus);
  const [profileClassNumber, setProfileClassNumber] = useState(classNumber);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    await logoutOnly();
    window.location.href = "/";
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

  const openProfileModal = () => {
    if (busy) return;
    setMenuOpen(false);
    setProfileCampus(campus);
    setProfileClassNumber(classNumber);
    setProfileError("");
    setProfileMessage("");
    setProfileOpen(true);
  };

  const closeProfileModal = () => {
    if (busy) return;
    setProfileOpen(false);
    setProfileError("");
    setProfileMessage("");
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
      window.location.href = "/login";
      return;
    }
    setDeleteError(result.error ?? "회원탈퇴에 실패했습니다.");
    setBusy(false);
  };

  const handleUpdateProfile = async () => {
    if (busy) return;
    setBusy(true);
    setProfileError("");
    setProfileMessage("");
    const result = await updateMyProfile({
      campus: profileCampus,
      classNumber: profileClassNumber,
    });
    if (result.ok) {
      setProfileMessage(result.message ?? "내 정보가 변경되었습니다.");
      window.location.reload();
      return;
    }
    setProfileError(result.error ?? "내 정보 변경에 실패했습니다.");
    setBusy(false);
  };

  const profileDialog =
    typeof document !== "undefined" && profileOpen
      ? createPortal(
          <div
            role="presentation"
            className="fixed inset-0 z-[1000] grid place-items-center bg-zinc-950/45 px-4 py-8 backdrop-blur-[1px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeProfileModal();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-title"
              className="w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="space-y-2">
                <p id="profile-title" className="text-xl font-bold text-zinc-950">
                  내 정보 변경
                </p>
                <p className="text-sm leading-6 text-zinc-500">
                  캠퍼스와 분반을 변경하면 이후 평균 비교 기준에 반영됩니다.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-[1fr_112px] gap-2">
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-500">
                    캠퍼스
                  </span>
                  <select
                    value={profileCampus}
                    onChange={(event) => {
                      const nextCampus = event.target.value as Campus;
                      setProfileCampus(nextCampus);
                      setProfileClassNumber(1);
                      setProfileError("");
                      setProfileMessage("");
                    }}
                    disabled={busy}
                    className="select-control mt-2 w-full rounded-lg border border-zinc-300 py-3 pl-4 text-sm outline-none focus:border-red-500 disabled:bg-zinc-50"
                  >
                    {CAMPUSES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-500">
                    분반
                  </span>
                  <select
                    value={profileClassNumber}
                    onChange={(event) => {
                      setProfileClassNumber(Number(event.target.value));
                      setProfileError("");
                      setProfileMessage("");
                    }}
                    disabled={busy}
                    className="select-control mt-2 w-full rounded-lg border border-zinc-300 py-3 pl-3 text-sm outline-none focus:border-red-500 disabled:bg-zinc-50"
                  >
                    {Array.from(
                      { length: maxClassForCampus(profileCampus) },
                      (_, index) => index + 1
                    ).map((option) => (
                      <option key={option} value={option}>
                        {option}반
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {profileError && (
                <p className="mt-3 text-xs text-red-600">{profileError}</p>
              )}
              {profileMessage && (
                <p className="mt-3 text-xs text-emerald-600">{profileMessage}</p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closeProfileModal}
                  disabled={busy}
                  className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleUpdateProfile()}
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

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
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
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
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-page focus:outline-none focus-visible:outline-none focus-visible:ring-0">
            {name}님
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-36 rounded-xl border border-hairline bg-white p-1 text-sm shadow-lg outline-none"
          >
            <DropdownMenu.Item
              onSelect={(event) => {
                event.preventDefault();
                void handleLogout();
              }}
              className="cursor-pointer rounded-lg px-3 py-2 text-ink-2 outline-none ring-0 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            >
              로그아웃
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(event) => {
                event.preventDefault();
                openProfileModal();
              }}
              className="cursor-pointer rounded-lg px-3 py-2 text-ink-2 outline-none ring-0 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            >
              내 정보 변경
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-zinc-100" />
            <DropdownMenu.Item
              onSelect={(event) => {
                event.preventDefault();
                openDeleteModal();
              }}
              className="cursor-pointer rounded-lg px-3 py-2 text-red-600 outline-none ring-0 hover:bg-red-50 focus:bg-red-50 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            >
              회원탈퇴
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {profileDialog}
      {deleteDialog}
    </>
  );
}
