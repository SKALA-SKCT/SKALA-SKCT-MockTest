"use server";

import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, CAMPUSES, maxClassForCampus, users, type Campus } from "@/db/schema";
import { sendMail } from "@/lib/mail";
import { hitRateLimit } from "@/lib/rate-limit";
import { destroySession } from "@/lib/session";

function validateCampusClass(campus: string, classNumber: number): string | null {
  if (!CAMPUSES.includes(campus as Campus)) {
    return "캠퍼스를 선택해주세요.";
  }
  const maxClass = maxClassForCampus(campus as Campus);
  if (!Number.isInteger(classNumber) || classNumber < 1 || classNumber > maxClass) {
    return `${campus} 캠퍼스는 1~${maxClass}반까지 선택할 수 있습니다.`;
  }
  return null;
}

function validatePassword(pin: string): string | null {
  if (pin.length < 6 || pin.length > 32) {
    return "비밀번호는 6~32자로 입력해주세요.";
  }
  if (!/^[A-Za-z0-9!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]+$/.test(pin)) {
    return "비밀번호는 영문, 숫자, 특수기호만 사용할 수 있습니다.";
  }
  return null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isLimited(action: string, identifier: string) {
  return hitRateLimit(`${action}:${identifier.toLowerCase()}`, 5, 15 * 60 * 1000);
}

export async function logoutOnly() {
  await destroySession();
}

export async function deleteAccountWithNickname(confirmNickname: string) {
  const { getSessionUserId } = await import("@/lib/session");
  const userId = await getSessionUserId();
  if (userId == null) {
    await destroySession();
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const [user] = await db
    .select({ id: users.id, nickname: users.nickname })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) {
    await destroySession();
    return { ok: false, error: "계정을 찾을 수 없습니다." };
  }
  if (confirmNickname.trim() !== user.nickname) {
    return { ok: false, error: "아이디가 일치하지 않습니다." };
  }

  await db.delete(users).where(eq(users.id, user.id));
  await destroySession();
  return { ok: true };
}

export async function updateMyProfile({
  campus,
  classNumber,
}: {
  campus: string;
  classNumber: number;
}) {
  const { getSessionUserId } = await import("@/lib/session");
  const userId = await getSessionUserId();
  if (userId == null) return { ok: false, error: "로그인이 필요합니다." };

  const campusErr = validateCampusClass(campus, classNumber);
  if (campusErr) return { ok: false, error: campusErr };

  await db
    .update(users)
    .set({ campus: campus as Campus, classNumber })
    .where(eq(users.id, userId));
  return { ok: true, message: "내 정보가 변경되었습니다." };
}

export async function requestMyPasswordChangeCode() {
  const { getSessionUserId } = await import("@/lib/session");
  const userId = await getSessionUserId();
  if (userId == null) return { ok: false, error: "로그인이 필요합니다." };

  const [user] = await db
    .select({ id: users.id, email: users.email, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.id, userId));
  if (!user?.email || !user.emailVerifiedAt) {
    return { ok: false, error: "인증된 이메일이 필요합니다." };
  }
  if (isLimited("my-password-change", String(user.id))) {
    return { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.insert(authTokens).values({
    userId: user.id,
    email: user.email,
    purpose: "password_reset",
    tokenHash: hashToken(code),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    await sendMail({
      to: user.email,
      subject: "[SKCT 모의고사] 비밀번호 변경 인증번호",
      text: `비밀번호 변경 인증번호는 ${code} 입니다.\n\n이 인증번호는 10분 동안 유효합니다.`,
    });
  } catch {
    return { ok: false, error: "메일 발송 설정을 확인해주세요." };
  }

  return { ok: true, message: "인증번호를 보냈습니다." };
}

export async function changeMyPasswordWithCode({
  code,
  pin,
  pinConfirm,
}: {
  code: string;
  pin: string;
  pinConfirm: string;
}) {
  const { getSessionUserId } = await import("@/lib/session");
  const userId = await getSessionUserId();
  if (userId == null) return { ok: false, error: "로그인이 필요합니다." };
  if (pin !== pinConfirm) return { ok: false, error: "비밀번호가 서로 일치하지 않습니다." };
  const err = validatePassword(pin);
  if (err) return { ok: false, error: err };

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  if (!user?.email) return { ok: false, error: "계정을 찾을 수 없습니다." };

  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.userId, user.id),
        eq(authTokens.email, user.email),
        eq(authTokens.purpose, "password_reset"),
        eq(authTokens.tokenHash, hashToken(code.trim())),
        isNull(authTokens.usedAt)
      )
    )
    .orderBy(sql`${authTokens.createdAt} desc`)
    .limit(1);

  if (!row || row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "인증번호가 올바르지 않거나 만료되었습니다." };
  }

  await db
    .update(users)
    .set({ pinHash: await bcrypt.hash(pin, 12) })
    .where(eq(users.id, user.id));
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(eq(authTokens.id, row.id));

  return { ok: true, message: "비밀번호가 변경되었습니다." };
}
