import { timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

function hasValidSecret(request: Request, expected: string) {
  const actual = request.headers.get("x-legacy-secret") ?? "";
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

// Mother가 첫 카카오 로그인 후 기존 MockTest 계정을 연결할 때만 사용하는
// 내부 검증 API다. 기존 users.id를 반환해 attempts/responses를 그대로 이어 쓴다.
export async function POST(request: Request) {
  const secret = process.env.SKCT_LEGACY_VERIFY_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "legacy verification is not configured" },
      { status: 503 }
    );
  }

  if (!hasValidSecret(request, secret)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const nickname = String(body?.nickname ?? "").trim();
  const password = String(body?.password ?? "");
  if (!nickname || !password) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const [user] = await db
    .select({
      id: users.id,
      nickname: users.nickname,
      pinHash: users.pinHash,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(eq(users.nickname, nickname))
    .limit(1);

  let passwordMatches = false;
  if (user?.pinHash && !user.pinHash.startsWith("mother:")) {
    try {
      passwordMatches = await bcrypt.compare(password, user.pinHash);
    } catch {
      passwordMatches = false;
    }
  }

  if (!user || !passwordMatches) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    skctUserId: user.id,
    nick: user.nickname,
    isAdmin: user.isAdmin,
  });
}
