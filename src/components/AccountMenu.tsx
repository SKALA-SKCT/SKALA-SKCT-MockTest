"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { deleteAccount, logout } from "@/lib/actions/auth";

export default function AccountMenu({ nickname }: { nickname: string }) {
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
          <DropdownMenu.Item asChild className="outline-none focus:outline-none focus-visible:outline-none">
            <form action={logout}>
              <button className="w-full rounded-lg px-3 py-2 text-left text-ink-2 outline-none ring-0 hover:bg-zinc-50 focus:outline-none focus-visible:outline-none focus-visible:ring-0">
                로그아웃
              </button>
            </form>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-100" />
          <DropdownMenu.Item asChild className="outline-none focus:outline-none focus-visible:outline-none">
            <form action={deleteAccount}>
              <button className="w-full rounded-lg px-3 py-2 text-left text-red-600 outline-none ring-0 hover:bg-red-50 focus:outline-none focus-visible:outline-none focus-visible:ring-0">
                회원탈퇴
              </button>
            </form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
