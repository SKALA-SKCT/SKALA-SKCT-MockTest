import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const COOKIE = "skct_session";
let cachedSecret: Uint8Array | null = null;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

const DEPLOYED_MOTHER_PAGE_URL = "https://skala-skct-landing.vercel.app";
const LOCAL_MOTHER_PAGE_URL = "http://localhost:3000";

export function motherPageUrl(path = "/login") {
  const configured =
    process.env.MOTHER_PAGE_URL ||
    process.env.NEXT_PUBLIC_MOTHER_PAGE_URL;
  const base =
    process.env.NODE_ENV === "production"
      ? configured && !configured.includes("localhost")
        ? configured
        : DEPLOYED_MOTHER_PAGE_URL
      : configured || LOCAL_MOTHER_PAGE_URL;
  return new URL(path, base).toString();
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  cachedSecret ??= new TextEncoder().encode(secret);
  return cachedSecret;
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSessionSecret());
  const store = await cookies();
  store.set(COOKIE, token, {
    maxAge: 60 * 60 * 24 * 30,
    ...SESSION_COOKIE_OPTIONS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.set(COOKIE, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

export async function getSessionUserId(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const uid = await getSessionUserId();
  if (uid == null) return null;
  const [user] = await db.select().from(users).where(eq(users.id, uid));
  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect(motherPageUrl("/login"));
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}
