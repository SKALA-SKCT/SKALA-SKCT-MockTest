import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import AccountMenu from "@/components/AccountMenu";
import BrandMark from "@/components/BrandMark";
import HeaderServiceNav from "@/components/HeaderServiceNav";
import { getMotherUrl } from "@/lib/mother-auth";

export const metadata: Metadata = {
  metadataBase: new URL("https://skala-skct.vercel.app"),
  title: "SKCT 실전 모의고사",
  description: "SKCT 실전 모의고사",
  openGraph: {
    title: "SKCT 실전 모의고사",
    description: "SKCT 실전 모의고사",
    siteName: "SKCT 실전 모의고사",
    type: "website",
    url: "https://skala-skct.vercel.app",
    images: [
      {
        url: "/api/og-image",
        secureUrl: "https://skala-skct.vercel.app/api/og-image",
        alt: "SKCT 모의고사 대시보드",
        type: "image/png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SKCT 실전 모의고사",
    description: "SKCT 실전 모의고사",
    images: [
      {
        url: "/api/og-image",
        alt: "SKCT 모의고사 대시보드",
        type: "image/png",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export const preferredRegion = "sin1";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const motherUrl = getMotherUrl();
  const practiceUrl =
    process.env.NEXT_PUBLIC_PRACTICE_URL ?? "https://practice.skala-skct.com";
  const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "https://community.skala-skct.com";

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <>
            <Script
              id="google-tag-manager"
              strategy="afterInteractive"
            >
              {`
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');
              `}
            </Script>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="Google Tag Manager"
              />
            </noscript>
          </>
        )}
        <div className="desktop-app-shell flex min-h-full flex-col">
          {user && (
            <header className="app-header sticky top-0 z-[60] bg-[rgba(250,250,249,0.86)] [backdrop-filter:blur(18px)_saturate(160%)] [transition:background-color_0.3s_ease]">
              <nav className="mx-auto grid h-[68px] w-[min(1200px,calc(100vw-48px))] grid-cols-[1fr_auto_1fr] items-center gap-6 max-[980px]:grid-cols-[1fr_auto]">
                <Link href="/" className="flex items-center justify-self-start">
                  <BrandMark />
                </Link>
                <div className="max-[980px]:hidden"><HeaderServiceNav motherUrl={motherUrl} practiceUrl={practiceUrl} communityUrl={communityUrl} /></div>
                <div className="flex items-center justify-self-end gap-2">
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-page focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                    >
                      관리자
                    </Link>
                  )}
                  <AccountMenu
                    nickname={user.nickname}
                    name={user.name}
                  />
                </div>
              </nav>
            </header>
          )}
          <main className="app-main mx-auto w-full max-w-[1248px] flex-1 px-6 py-5 max-[640px]:px-3">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
