import Link from "next/link";
import SimpleActionForm from "@/components/SimpleActionForm";
import { requestPasswordReset } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-center text-2xl font-bold">비밀번호 찾기</h1>
      <p className="mt-2 text-center text-sm text-zinc-500">
        아이디와 인증 이메일이 일치하면 재설정 링크를 보냅니다.
      </p>
      <SimpleActionForm
        action={requestPasswordReset}
        submitLabel="재설정 메일 받기"
        fields={[
          { name: "nickname", placeholder: "아이디" },
          { name: "email", type: "email", placeholder: "이메일" },
        ]}
      />
      <Link href="/login" className="mt-4 block text-center text-sm text-red-600">
        로그인으로 돌아가기
      </Link>
    </div>
  );
}
