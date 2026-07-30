import { redirect } from "next/navigation";
import { getMotherLoginUrl } from "@/lib/mother-auth";

export default async function RegisterPage() {
  redirect(getMotherLoginUrl("/"));
}
