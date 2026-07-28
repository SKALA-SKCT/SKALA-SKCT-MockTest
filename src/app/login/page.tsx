import { redirect } from "next/navigation";
import { motherPageUrl } from "@/lib/session";

export default async function LoginPage() {
  redirect(motherPageUrl("/login"));
}
