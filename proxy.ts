import { NextResponse, type NextRequest } from "next/server";

const DESKTOP_ONLY_PATH = "/desktop-only";
const MOBILE_USER_AGENT =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
