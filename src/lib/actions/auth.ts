"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/session";

export type AuthFormState = { error?: string };

function validate(nickname: string, pin: string): string | null {
  if (!nickname || nickname.length < 1 || nickname.length > 12)
    return "아이디는 1~12자로 입력해주세요.";
  if (pin.length < 6 || pin.length > 32)
    return "비밀번호는 6~32자로 입력해주세요.";
  if (!/^[A-Za-z0-9!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]+$/.test(pin))
    return "비밀번호는 영문, 숫자, 특수기호만 사용할 수 있습니다.";
  return null;
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

export async function register(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  const pinConfirm = String(formData.get("pinConfirm") ?? "");
  const err = validate(nickname, pin);
  if (err) return { error: err };
  if (pin !== pinConfirm) return { error: "비밀번호가 서로 일치하지 않습니다." };

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.nickname, nickname));
  if (existing) return { error: "이미 사용 중인 아이디입니다." };

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  const pinHash = await bcrypt.hash(pin, 10);
  const [user] = await db
    .insert(users)
    .values({ nickname, pinHash, isAdmin: count === 0 })
    .returning();

  await createSession(user.id);
  redirect("/");
}

export async function login(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.nickname, nickname));
  if (!user || !(await bcrypt.compare(pin, user.pinHash)))
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
