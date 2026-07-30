import { redirect } from "next/navigation";
import { getMotherLoginUrl } from "@/lib/mother-auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await searchParams;
  redirect(getMotherLoginUrl("/"));
}
