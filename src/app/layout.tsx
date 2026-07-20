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
        <div className="desktop-app-shell flex min-h-full flex-col">
          {user && (
            <header className="sticky top-0 z-10 border-b border-hairline bg-surface/90 backdrop-blur">
              <nav className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-6">
                <Link href="/" className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black tracking-tight text-brand">
                    SKCT
                  </span>
                  <span className="text-sm font-semibold text-ink-2">
                    스터디
                  </span>
                </Link>
                <div className="ml-auto flex items-center gap-2">
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold text-ink-2 transition hover:bg-page"
                    >
                      관리자
                    </Link>
                  )}
                  <AccountMenu
                    nickname={user.nickname}
                    name={user.name}
                    email={user.email}
                    campus={user.campus}
                    classNumber={user.classNumber}
                    isAdmin={user.isAdmin}
                  />
                </div>
              </nav>
            </header>
          )}
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
            {children}
          </main>
        </div>
        <div className="mobile-viewport-guard">
          <section className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-7 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl font-black text-brand">
              SK
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
              Desktop Only
            </p>
            <h1 className="mt-3 text-2xl font-black text-ink">
              데스크탑에서 이용해주세요.
            </h1>
            <p className="mt-4 text-sm leading-6 text-ink-2">
              SKCT 스터디는 문제 풀이와 결과 분석을 정확하게 보여주기 위해
              데스크탑 화면에 맞춰 제공됩니다. 노트북 또는 데스크탑 브라우저로
              접속해주세요.
            </p>
          </section>
        </div>
      </body>
    </html>
  );
}
