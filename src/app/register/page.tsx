import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { register } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/session";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <AuthForm
      action={register}
      title="회원가입"
      submitLabel="가입하기"
      altHref="/login"
      altLabel="이미 계정이 있나요? 로그인"
      isRegister
    />
  );
}
