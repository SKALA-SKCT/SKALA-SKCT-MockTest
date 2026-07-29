import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type Campus } from "@/db/schema";

const COOKIE = "skct_session";
let cachedSecret: Uint8Array | null = null;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  cachedSecret ??= new TextEncoder().encode(secret);
  return cachedSecret;
}

// 마더(관문)가 발급한 공유 세션 JWT의 클레임.
export interface SessionClaims {
  sub: string; // kakao:<id> | skct:<userId> | skala:<nick>
  nick?: string;
  skctUserId?: number; // 연결된 skct users.id (레거시/연결 계정)
  skalaHandle?: string;
  admin?: boolean;
}

/** 로그인 관문(마더) URL. 미인증 시 이곳으로 보낸다. */
export function motherLoginUrl(): string {
  const mother = process.env.NEXT_PUBLIC_MOTHER_URL || "";
  const self = process.env.NEXT_PUBLIC_SKCT_URL || "";
  if (!mother) return "/login"; // 로컬 폴백: /login 페이지가 마더로 리다이렉트
  const q = self ? `?redirect=${encodeURIComponent(self)}` : "";
  return `${mother.replace(/\/$/, "")}/login${q}`;
}

async function readClaims(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      nick: typeof payload.nick === "string" ? payload.nick : undefined,
      skctUserId: typeof payload.skctUserId === "number" ? payload.skctUserId : undefined,
      skalaHandle: typeof payload.skalaHandle === "string" ? payload.skalaHandle : undefined,
      admin: Boolean(payload.admin),
    };
  } catch {
    return null;
  }
}

type UserRow = typeof users.$inferSelect;

// 클레임 → skct 로컬 유저. 연결된 skctUserId가 있으면 그 행을, 없으면 externalId로 upsert.
async function resolveUser(claims: SessionClaims): Promise<UserRow | null> {
  if (claims.skctUserId) {
    const [linked] = await db.select().from(users).where(eq(users.id, claims.skctUserId));
    if (linked) return linked;
  }
  const [existing] = await db.select().from(users).where(eq(users.externalId, claims.sub));
  if (existing) return existing;

  // 신규(주로 카카오) 유저 provisioning. 캠퍼스/분반은 온보딩 전 임시값 + onboarded=false.
  const base = ((claims.nick || "user").trim().slice(0, 10) || "user").replace(/\s+/g, "");
  for (let i = 0; i < 25; i++) {
    const nickname = (i === 0 ? base : `${base}${i}`).slice(0, 12);
    try {
      const [row] = await db
        .insert(users)
        .values({
          externalId: claims.sub,
          nickname,
          name: claims.nick || nickname,
          campus: "판교" as Campus,
          classNumber: 1,
          isAdmin: !!claims.admin,
          onboarded: false,
        })
        .onConflictDoNothing({ target: users.externalId })
        .returning();
      if (row) return row;
      // externalId 충돌(동시 생성) → 이미 만들어진 행 반환
      const [race] = await db.select().from(users).where(eq(users.externalId, claims.sub));
      if (race) return race;
    } catch {
      // nickname 유니크 충돌 → 다음 후보로 재시도
      continue;
    }
  }
  return null;
}

export async function getSessionUserId(): Promise<number | null> {
  return (await getCurrentUser())?.id ?? null;
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const claims = await readClaims();
  if (!claims) return null;
  return resolveUser(claims);
}

export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect(motherLoginUrl());
  // 카카오 신규 유저는 캠퍼스/분반 온보딩을 먼저 마쳐야 한다(레거시는 externalId=null이라 통과).
  if (user.externalId && !user.onboarded) redirect("/onboarding");
  return user;
}

export async function requireAdmin(): Promise<UserRow> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

/** 공유 세션 쿠키 제거(Domain 스코프). 세 서브도메인 모두 무효화. */
export async function destroySession() {
  const store = await cookies();
  store.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
    maxAge: 0,
  });
}
