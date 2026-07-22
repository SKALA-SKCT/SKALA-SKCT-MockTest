import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { hitRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function serializeMessage(row: {
  id: number;
  userId: number;
  body: string;
  isAnonymous: boolean;
  createdAt: Date;
  name: string;
  campus: string;
  classNumber: number;
  viewerId: number;
}) {
  return {
    id: row.id,
    body: row.body,
    isAnonymous: row.isAnonymous,
    mine: row.userId === row.viewerId,
    author: row.isAnonymous ? "익명" : row.name,
    meta: row.isAnonymous ? null : `${row.campus} ${row.classNumber}반`,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const rows = await db
    .select({
      id: chatMessages.id,
      userId: chatMessages.userId,
      body: chatMessages.body,
      isAnonymous: chatMessages.isAnonymous,
      createdAt: chatMessages.createdAt,
      name: users.name,
      campus: users.campus,
      classNumber: users.classNumber,
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(80);

  return NextResponse.json({
    ok: true,
    messages: rows
      .reverse()
      .map((row) => serializeMessage({ ...row, viewerId: user.id })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (hitRateLimit(`chat:${user.id}`, 20, 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "글을 너무 빠르게 보내고 있습니다." },
      { status: 429 }
    );
  }

  const payload = await request.json().catch(() => null);
  const body = String(payload?.body ?? "").trim().slice(0, 500);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "글을 입력해주세요." },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(chatMessages)
    .values({ userId: user.id, body, isAnonymous: true })
    .returning({
      id: chatMessages.id,
      userId: chatMessages.userId,
      body: chatMessages.body,
      isAnonymous: chatMessages.isAnonymous,
      createdAt: chatMessages.createdAt,
    });

  return NextResponse.json({
    ok: true,
    message: serializeMessage({
      ...created,
      name: user.name,
      campus: user.campus,
      classNumber: user.classNumber,
      viewerId: user.id,
    }),
  });
}
