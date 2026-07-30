const DEFAULT_MOTHER_URL = "https://skala-skct.com";
const DEFAULT_APP_URL = "https://skala-skct.vercel.app";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getMotherUrl() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_MOTHER_URL ??
      process.env.MOTHER_URL ??
      DEFAULT_MOTHER_URL
  );
}

export function getAppUrl() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_URL ??
      DEFAULT_APP_URL
  );
}

export function getMotherLoginUrl(path = "/") {
  const target = new URL(path, `${getAppUrl()}/`);
  const login = new URL("/login", `${getMotherUrl()}/`);
  login.searchParams.set("redirect", target.toString());
  return login.toString();
}
