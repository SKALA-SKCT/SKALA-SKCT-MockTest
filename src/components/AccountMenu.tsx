"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import { deleteAccountOnly, logoutOnly } from "@/lib/actions/auth";

export default function AccountMenu({ nickname }: { nickname: string }) {
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    await logoutOnly();
    window.location.href = "/login";
  };

  const handleDeleteAccount = async () => {
    if (busy) return;
    if (!window.confirm("회원탈퇴하면 모든 응시 기록이 삭제됩니다. 계속할까요?")) {
      return;
    }
    setBusy(true);
    await deleteAccountOnly();
    window.location.href = "/login";
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-page focus:outline-none focus-visible:outline-none focus-visible:ring-0">
          {nickname}님
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
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-100" />
          <DropdownMenu.Item
            onSelect={(event) => {
              event.preventDefault();
              void handleDeleteAccount();
            }}
            className="cursor-pointer rounded-lg px-3 py-2 text-red-600 outline-none ring-0 hover:bg-red-50 focus:bg-red-50 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
          >
            회원탈퇴
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
