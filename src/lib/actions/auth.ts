"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { CAMPUSES, maxClassForCampus, users, type Campus } from "@/db/schema";
import { destroySession, getSessionUserId, motherLoginUrl } from "@/lib/session";

// 로그인/회원가입/이메일 인증은 마더(관문)로 이관됨. 여기엔 로그인된 유저의
// 프로필/온보딩/탈퇴/로그아웃만 남긴다.

function validateCampusClass(campus: string, classNumber: number): string | null {
  if (!CAMPUSES.includes(campus as Campus)) return "캠퍼스를 선택해주세요.";
  const maxClass = maxClassForCampus(campus as Campus);
  if (!Number.isInteger(classNumber) || classNumber < 1 || classNumber > maxClass)
    return `${campus} 캠퍼스는 1~${maxClass}반까지 선택할 수 있습니다.`;
  return null;
}

export async function logout() {
  await destroySession();
  redirect(motherLoginUrl());
}

export async function logoutOnly() {
  await destroySession();
}

/** 카카오 신규 유저의 캠퍼스/분반 온보딩 저장. */
export async function saveOnboarding({
  campus,
  classNumber,
}: {
  campus: string;
  classNumber: number;
}) {
  const userId = await getSessionUserId();
  if (userId == null) return { ok: false, error: "로그인이 필요합니다." };
  const err = validateCampusClass(campus, classNumber);
  if (err) return { ok: false, error: err };
  await db
    .update(users)
    .set({ campus: campus as Campus, classNumber, onboarded: true })
    .where(eq(users.id, userId));
  return { ok: true };
}

export async function updateMyProfile({
  campus,
  classNumber,
}: {
  campus: string;
  classNumber: number;
}) {
  const userId = await getSessionUserId();
  if (userId == null) return { ok: false, error: "로그인이 필요합니다." };
  const err = validateCampusClass(campus, classNumber);
  if (err) return { ok: false, error: err };
  await db
    .update(users)
    .set({ campus: campus as Campus, classNumber })
    .where(eq(users.id, userId));
  return { ok: true, message: "내 정보가 변경되었습니다." };
}

export async function deleteAccountWithNickname(confirmNickname: string) {
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
