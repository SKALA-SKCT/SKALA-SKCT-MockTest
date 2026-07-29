import { redirect } from "next/navigation";
import { CAMPUSES } from "@/db/schema";
import { getCurrentUser, motherLoginUrl } from "@/lib/session";
import OnboardingForm from "@/components/OnboardingForm";

// 카카오 신규 유저가 캠퍼스/분반을 정하는 온보딩. 레거시/이미 완료 유저는 홈으로.
export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect(motherLoginUrl());
  if (!user.externalId || user.onboarded) redirect("/");
  return <OnboardingForm campuses={CAMPUSES} />;
}
