import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const startedAt = Date.now();
  const [row] = await db
    .select({ now: sql<string>`now()::text` })
    .from(sql`(select 1) as keepalive`);

  return NextResponse.json({
    ok: true,
    database: "awake",
    now: row?.now,
    ms: Date.now() - startedAt,
  });
}
