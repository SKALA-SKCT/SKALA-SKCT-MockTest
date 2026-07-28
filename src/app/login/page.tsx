import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { login } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <AuthForm
      action={login}
      title="로그인"
      submitLabel="로그인"
      altHref="/register"
      altLabel="처음이신가요? 가입하기"
    />
  );
}
