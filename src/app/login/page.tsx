import { redirect } from "next/navigation";
import { getCurrentUser, motherLoginUrl } from "@/lib/session";

// 로그인은 마더(관문)로 이관됨. /login 접근 시 관문으로 보낸다(이미 로그인 상태면 홈).
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  redirect(motherLoginUrl());
}
