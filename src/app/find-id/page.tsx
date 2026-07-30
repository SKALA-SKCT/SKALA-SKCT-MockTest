import { redirect } from "next/navigation";
import { getMotherLoginUrl } from "@/lib/mother-auth";

export default function FindIdPage() {
  redirect(getMotherLoginUrl("/"));
}
