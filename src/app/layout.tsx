import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import AccountMenu from "@/components/AccountMenu";

export const metadata: Metadata = {
  title: "SKCT 스터디",
  description: "스터디원끼리 모의고사 풀고 비교 분석하는 사이트",
};

export const preferredRegion = "sin1";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {user && (
          <header className="sticky top-0 z-10 border-b border-hairline bg-surface/90 backdrop-blur">
            <nav className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-6">
              <Link href="/" className="flex items-baseline gap-1.5">
                <span className="text-xl font-black tracking-tight text-brand">
                  SKCT
                </span>
                <span className="text-sm font-semibold text-ink-2">스터디</span>
              </Link>
              <div className="ml-auto flex items-center gap-2">
                <AccountMenu
                  nickname={user.nickname}
                  name={user.name}
                  email={user.email}
                />
              </div>
            </nav>
          </header>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
