import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getMotherLoginUrl } from "@/lib/mother-auth";

const COOKIE = "skct_session";
let cachedSecret: Uint8Array | null = null;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

type MotherClaims = {
  uid?: number;
  sub?: string;
  nick?: string;
  skctUserId?: number;
  skalaHandle?: string;
  admin?: boolean;
};

function makeMotherNickname(claims: MotherClaims) {
  const linkedHandle = claims.skalaHandle?.trim();
  if (linkedHandle) return linkedHandle;

  const source =
    claims.sub?.trim() ||
    (typeof claims.uid === "number" ? `uid:${claims.uid}` : "") ||
    claims.nick?.trim();
  if (!source) return "";

  const digest = createHash("sha256").update(source).digest("hex").slice(0, 10);
  return `m_${digest}`;
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
    domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.set(COOKIE, "", {
    ...SESSION_COOKIE_OPTIONS,
    domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
    maxAge: 0,
  });
}

async function findOrCreateMotherUser(claims: MotherClaims) {
  const linkedId = typeof claims.skctUserId === "number" ? claims.skctUserId : claims.uid;
  if (typeof linkedId === "number") {
    const [linkedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, linkedId));
    if (linkedUser) return linkedUser;
  }

  const nickname = makeMotherNickname(claims);
  if (!nickname) return null;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.nickname, nickname));
  if (existing) return existing;

  const name = claims.nick?.trim() || nickname;
  try {
    const [created] = await db
      .insert(users)
      .values({
        nickname,
        name,
        pinHash: "mother:shared-session",
        isAdmin: !!claims.admin,
      })
      .returning();
    return created;
  } catch {
    const [raced] = await db
      .select()
      .from(users)
      .where(eq(users.nickname, nickname));
    return raced ?? null;
  }
}

export const getSessionUserId = cache(async (): Promise<number | null> => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (typeof payload.uid === "number") return payload.uid;
    const user = await findOrCreateMotherUser(payload as MotherClaims);
    return user?.id ?? null;
  } catch {
    return null;
  }
});

export const getCurrentUser = cache(async () => {
  const uid = await getSessionUserId();
  if (uid == null) return null;
  const [user] = await db.select().from(users).where(eq(users.id, uid));
  return user ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect(getMotherLoginUrl("/"));
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}
