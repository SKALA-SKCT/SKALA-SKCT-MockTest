"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

function normalizeId(formData: FormData, key: string) {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("잘못된 요청입니다.");
  }
  return id;
}

export async function setUserAdminRole(formData: FormData) {
  const admin = await requireAdmin();
  const targetUserId = normalizeId(formData, "userId");
  const nextIsAdmin = formData.get("isAdmin") === "true";

  if (targetUserId === admin.id && !nextIsAdmin) {
    throw new Error("본인 관리자 권한은 회수할 수 없습니다.");
  }

  const [target] = await db
    .select({ id: users.id, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, targetUserId));
  if (!target) throw new Error("사용자를 찾을 수 없습니다.");

  if (!nextIsAdmin && target.isAdmin) {
    const [adminCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isAdmin, true));
    if ((adminCount?.count ?? 0) <= 1) {
      throw new Error("마지막 관리자 권한은 회수할 수 없습니다.");
    }
  }

  await db
    .update(users)
    .set({ isAdmin: nextIsAdmin })
    .where(eq(users.id, targetUserId));

  revalidatePath("/admin");
}
