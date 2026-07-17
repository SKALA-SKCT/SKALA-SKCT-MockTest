"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { authTokens, users } from "@/db/schema";
import { appUrl, sendMail } from "@/lib/mail";
import { hitRateLimit } from "@/lib/rate-limit";
import { createSession, destroySession } from "@/lib/session";

export type AuthFormState = { error?: string; message?: string };

function validateName(name: string): string | null {
  if (!name || name.length < 1 || name.length > 20)
    return "이름은 1~20자로 입력해주세요.";
  return null;
}

function validate(nickname: string, pin: string): string | null {
  if (!nickname || nickname.length < 1 || nickname.length > 12)
    return "아이디는 1~12자로 입력해주세요.";
  return validatePassword(pin);
}

function validatePassword(pin: string): string | null {
  if (pin.length < 6 || pin.length > 32)
    return "비밀번호는 6~32자로 입력해주세요.";
  if (!/^[A-Za-z0-9!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]+$/.test(pin))
    return "비밀번호는 영문, 숫자, 특수기호만 사용할 수 있습니다.";
  return null;
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function createAuthToken({
  userId,
  email,
  purpose,
  minutes,
}: {
  userId?: number;
  email: string;
  purpose: "email_verify" | "find_id" | "password_reset";
  minutes: number;
}) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(authTokens).values({
    userId,
    email,
    purpose,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + minutes * 60 * 1000),
  });
  return token;
}

function isLimited(action: string, identifier: string) {
  return hitRateLimit(
    `${action}:${identifier.toLowerCase()}`,
    5,
    15 * 60 * 1000
  );
}

/** 닉네임 중복 실시간 확인용 */
export async function checkNickname(nickname: string): Promise<{
  available: boolean;
}> {
  const trimmed = nickname.trim();
  if (!trimmed) return { available: false };
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.nickname, trimmed));
  return { available: !existing };
}

export async function checkEmail(email: string): Promise<{
  exists: boolean;
  valid: boolean;
}> {
  const trimmed = email.trim().toLowerCase();
  if (!validateEmail(trimmed)) return { exists: false, valid: false };
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, trimmed));
  return { exists: Boolean(existing), valid: true };
}

export async function checkPasswordResetIdentity({
  nickname,
  email,
}: {
  nickname: string;
  email: string;
}): Promise<{ exists: boolean; valid: boolean }> {
  const trimmedNickname = nickname.trim();
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedNickname || !validateEmail(trimmedEmail)) {
    return { exists: false, valid: false };
  }
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.nickname, trimmedNickname), eq(users.email, trimmedEmail))
    );
  return { exists: Boolean(existing), valid: true };
}

export async function register(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const pin = String(formData.get("pin") ?? "");
  const pinConfirm = String(formData.get("pinConfirm") ?? "");
  if (isLimited("register", email || nickname))
    return { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." };
  const err = validate(nickname, pin);
  if (err) return { error: err };
  const nameErr = validateName(name);
  if (nameErr) return { error: nameErr };
  if (!validateEmail(email)) return { error: "이메일을 올바르게 입력해주세요." };
  if (pin !== pinConfirm) return { error: "비밀번호가 서로 일치하지 않습니다." };

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.nickname, nickname));
  if (existing) return { error: "이미 사용 중인 아이디입니다." };
  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existingEmail) return { error: "이미 사용 중인 이메일입니다." };

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  const pinHash = await bcrypt.hash(pin, 12);
  const [user] = await db
    .insert(users)
    .values({ nickname, name, email, pinHash, isAdmin: count === 0 })
    .returning();

  const token = await createAuthToken({
    userId: user.id,
    email,
    purpose: "email_verify",
    minutes: 60,
  });
  const url = appUrl(`/verify-email?token=${token}`);
  try {
    await sendMail({
      to: email,
      subject: "[SKCT 스터디] 이메일 인증",
      text: `아래 링크를 눌러 회원가입을 완료해주세요.\n\n${url}\n\n이 링크는 60분 동안 유효합니다.`,
    });
  } catch {
    await db.delete(users).where(eq(users.id, user.id));
    return { error: "메일 발송 설정을 확인해주세요." };
  }

  redirect(`/verify-email/sent?email=${encodeURIComponent(email)}`);
}

export async function login(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  if (isLimited("login", nickname))
    return { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.nickname, nickname));
  if (!user || !(await bcrypt.compare(pin, user.pinHash)))
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  if (user.email && !user.emailVerifiedAt)
    return { error: "이메일 인증 후 로그인할 수 있습니다." };

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
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
      subject: "[SKCT 스터디] 비밀번호 변경 인증번호",
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

export async function verifyEmailToken(token: string) {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, tokenHash),
        eq(authTokens.purpose, "email_verify"),
        isNull(authTokens.usedAt)
      )
    );
  if (!row || row.expiresAt.getTime() < Date.now() || !row.userId) {
    return { ok: false };
  }
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, row.userId));
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(eq(authTokens.id, row.id));
  return { ok: true };
}

export async function requestFindId(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!validateEmail(email)) return { error: "이메일을 올바르게 입력해주세요." };
  if (isLimited("find-id", email))
    return { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." };
  const matched = await db.select().from(users).where(eq(users.email, email));
  if (matched.length === 0) {
    return { error: "가입되어 있지 않은 이메일입니다." };
  }
  if (matched.length > 0) {
    const token = await createAuthToken({
      email,
      purpose: "find_id",
      minutes: 30,
    });
    const url = appUrl(`/find-id/result?token=${token}`);
    try {
      await sendMail({
        to: email,
        subject: "[SKCT 스터디] 아이디 찾기",
        text: `아래 링크에서 가입된 아이디를 확인할 수 있습니다.\n\n${url}\n\n이 링크는 30분 동안 유효합니다.`,
      });
    } catch {
      return { error: "메일 발송 설정을 확인해주세요." };
    }
  }
  return { message: "인증 메일을 보냈습니다. 받은메일함을 확인해주세요." };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!nickname) return { error: "아이디를 입력해주세요." };
  if (!validateEmail(email)) return { error: "이메일을 올바르게 입력해주세요." };
  if (isLimited("password-reset", `${nickname}:${email}`))
    return { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." };
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.nickname, nickname), eq(users.email, email)));
  if (!user) {
    return { error: "아이디와 이메일이 일치하는 계정을 찾을 수 없습니다." };
  }
  const token = await createAuthToken({
    userId: user.id,
    email,
    purpose: "password_reset",
    minutes: 30,
  });
  const url = appUrl(`/reset-password?token=${token}`);
  try {
    await sendMail({
      to: email,
      subject: "[SKCT 스터디] 비밀번호 재설정",
      text: `아래 링크에서 비밀번호를 재설정할 수 있습니다.\n\n${url}\n\n이 링크는 30분 동안 유효합니다.`,
    });
  } catch {
    return { error: "메일 발송 설정을 확인해주세요." };
  }
  return { message: "인증 메일을 보냈습니다. 받은메일함을 확인해주세요." };
}

export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const pinConfirm = String(formData.get("pinConfirm") ?? "");
  if (pin !== pinConfirm) return { error: "비밀번호가 서로 일치하지 않습니다." };
  const err = validatePassword(pin);
  if (err) return { error: err };

  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.purpose, "password_reset"),
        isNull(authTokens.usedAt)
      )
    );
  if (!row || row.expiresAt.getTime() < Date.now() || !row.userId) {
    return { error: "유효하지 않거나 만료된 링크입니다." };
  }
  await db
    .update(users)
    .set({ pinHash: await bcrypt.hash(pin, 12) })
    .where(eq(users.id, row.userId));
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(eq(authTokens.id, row.id));
  redirect("/login");
}

export async function consumeFindIdToken(token: string) {
  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.purpose, "find_id"),
        isNull(authTokens.usedAt)
      )
    );
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  const matched = await db
    .select({ nickname: users.nickname })
    .from(users)
    .where(eq(users.email, row.email));
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(eq(authTokens.id, row.id));
  return matched.map((u) => u.nickname);
}
