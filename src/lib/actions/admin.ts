"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  attempts,
  responses,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeId(formData: FormData, key: string) {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("잘못된 요청입니다.");
  }
  return id;
}

export type UserInfoState = { ok: boolean; error?: string };

export async function updateUserInfo(
  _prevState: UserInfoState,
  formData: FormData
): Promise<UserInfoState> {
  const admin = await requireAdmin();
  try {
    const targetUserId = normalizeId(formData, "userId");
    const nickname = String(formData.get("nickname") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const emailVerified = formData.get("emailVerified") === "true";
    const nextIsAdmin = formData.get("isAdmin") === "true";

    if (nickname.length < 1 || nickname.length > 12) {
      throw new Error("아이디는 1~12자로 입력해주세요.");
    }
    if (name.length < 1 || name.length > 20) {
      throw new Error("이름은 1~20자로 입력해주세요.");
    }
    if (email && !validateEmail(email)) {
      throw new Error("이메일을 올바르게 입력해주세요.");
    }

    const [target] = await db
      .select({
        id: users.id,
        emailVerifiedAt: users.emailVerifiedAt,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(eq(users.id, targetUserId));
    if (!target) throw new Error("사용자를 찾을 수 없습니다.");

    // 관리자 권한 변경 시 안전장치(본인/마지막 관리자 보호)
    if (target.isAdmin !== nextIsAdmin) {
      if (targetUserId === admin.id && !nextIsAdmin) {
        throw new Error("본인 관리자 권한은 회수할 수 없습니다.");
      }
      if (!nextIsAdmin && target.isAdmin) {
        const [adminCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.isAdmin, true));
        if ((adminCount?.count ?? 0) <= 1) {
          throw new Error("마지막 관리자 권한은 회수할 수 없습니다.");
        }
      }
    }

    const [nicknameOwner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.nickname, nickname));
    if (nicknameOwner && nicknameOwner.id !== targetUserId) {
      throw new Error("이미 사용 중인 아이디입니다.");
    }

    if (email) {
      const [emailOwner] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));
      if (emailOwner && emailOwner.id !== targetUserId) {
        throw new Error("이미 사용 중인 이메일입니다.");
      }
    }

    await db
      .update(users)
      .set({
        nickname,
        name,
        isAdmin: nextIsAdmin,
        email: email || null,
        emailVerifiedAt: email
          ? emailVerified
            ? (target.emailVerifiedAt ?? new Date())
            : null
          : null,
      })
      .where(eq(users.id, targetUserId));

    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "저장에 실패했습니다.",
    };
  }
}

export async function deleteAttemptRecord(formData: FormData) {
  await requireAdmin();
  const attemptId = normalizeId(formData, "attemptId");
  const [target] = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(eq(attempts.id, attemptId));
  if (!target) throw new Error("응시 기록을 찾을 수 없습니다.");

  await db.delete(responses).where(eq(responses.attemptId, attemptId));
  await db.delete(attempts).where(eq(attempts.id, attemptId));

  revalidatePath("/admin");
}
