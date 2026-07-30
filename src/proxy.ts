import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_HOST = "mock.skala-skct.com";
const LEGACY_HOSTS = new Set(["skala-skct.vercel.app"]);

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (!host || !LEGACY_HOSTS.has(host)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.protocol = "https";
  url.hostname = CANONICAL_HOST;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

