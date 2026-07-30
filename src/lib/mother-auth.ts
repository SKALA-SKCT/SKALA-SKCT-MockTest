const DEFAULT_MOTHER_URL = "https://www.skala-skct.com";
const DEFAULT_APP_URL = "https://skala-skct.vercel.app";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeUrl(value: string | undefined, fallback: string) {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    if (url.hostname === "skala-skct.com") {
      url.hostname = "www.skala-skct.com";
    }
    return trimTrailingSlash(url.toString());
  } catch {
    return fallback;
  }
}

export function getMotherUrl() {
  return normalizeUrl(
    process.env.NEXT_PUBLIC_MOTHER_URL ??
      process.env.MOTHER_URL,
    DEFAULT_MOTHER_URL
  );
}

export function getAppUrl() {
  return normalizeUrl(
    process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_URL,
    DEFAULT_APP_URL
  );
}

export function getMotherLoginUrl(path = "/") {
  const target = new URL(path, `${getAppUrl()}/`);
  const login = new URL("/login", `${getMotherUrl()}/`);
  login.searchParams.set("redirect", target.toString());
  return login.toString();
}
