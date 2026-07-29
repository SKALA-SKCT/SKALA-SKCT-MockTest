import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// 마더(관문)의 레거시 로그인 위임 엔드포인트. 기존 skct 계정(bcrypt)만 검증한다.
// 카카오로 upsert된 유저는 pinHash가 없어 자연히 매칭되지 않는다.
export async function POST(req: Request) {
  const secret = process.env.SKCT_LEGACY_VERIFY_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 500 });
  }
  if (req.headers.get("x-legacy-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const nickname = String(body?.nickname ?? "").trim();
  const password = String(body?.password ?? "");
  if (!nickname || !password) return NextResponse.json({ ok: false });

  const [user] = await db
    .select({
      id: users.id,
      nickname: users.nickname,
      pinHash: users.pinHash,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(eq(users.nickname, nickname));

  if (!user || !user.pinHash || !(await bcrypt.compare(password, user.pinHash))) {
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({
    ok: true,
    skctUserId: user.id,
    nick: user.nickname,
    isAdmin: user.isAdmin,
  });
}
