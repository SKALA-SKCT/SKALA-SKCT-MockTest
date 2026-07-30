import { redirect } from "next/navigation";
import { getMotherLoginUrl } from "@/lib/mother-auth";

export default async function VerifyEmailSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  await searchParams;
  redirect(getMotherLoginUrl("/"));
}
