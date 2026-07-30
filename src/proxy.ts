import { NextResponse, type NextRequest } from "next/server";

const MOTHER_HOST = "www.skala-skct.com";
const LEGACY_HOSTS = new Set(["skala-skct.vercel.app"]);
const DESKTOP_ONLY_PATH = "/desktop-only";
const MOBILE_USER_AGENT =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (host && LEGACY_HOSTS.has(host)) {
    return NextResponse.redirect(new URL(`https://${MOTHER_HOST}/`), 308);
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (pathname === DESKTOP_ONLY_PATH) return NextResponse.next();

  const userAgent = request.headers.get("user-agent") ?? "";
  const isMobileClientHint = request.headers.get("sec-ch-ua-mobile") === "?1";
  const isMobile = isMobileClientHint || MOBILE_USER_AGENT.test(userAgent);

  if (!isMobile) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = DESKTOP_ONLY_PATH;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
