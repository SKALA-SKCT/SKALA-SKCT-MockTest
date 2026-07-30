import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/session";

type MotherClaims = {
  sub?: string;
  nick?: string;
  skctUserId?: number;
  admin?: boolean;
};

let cachedSecret: Uint8Array | null = null;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  cachedSecret ??= new TextEncoder().encode(secret);
  return cachedSecret;
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

async function findOrCreateMotherUser(claims: MotherClaims) {
  if (typeof claims.skctUserId === "number") {
    const [linkedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, claims.skctUserId));
    if (linkedUser) return linkedUser;
  }

  const sub = claims.sub?.trim();
  if (!sub) return null;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.nickname, sub));
  if (existing) return existing;

  const name = claims.nick?.trim() || "카카오 회원";
  try {
    const [created] = await db
      .insert(users)
      .values({
        nickname: sub,
        name,
        pinHash: "mother:kakao",
        isAdmin: !!claims.admin,
      })
      .returning();
    return created;
  } catch {
    const [raced] = await db
      .select()
      .from(users)
      .where(eq(users.nickname, sub));
    return raced ?? null;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sso = url.searchParams.get("sso");
  const next = safeNext(url.searchParams.get("next"));

  if (!sso) return NextResponse.redirect(new URL("/", request.url));

  try {
    const { payload } = await jwtVerify(sso, getSessionSecret());
    const user = await findOrCreateMotherUser(payload as MotherClaims);
    if (!user) return NextResponse.redirect(new URL("/", request.url));

    await createSession(user.id);
    return NextResponse.redirect(new URL(next, request.url));
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
