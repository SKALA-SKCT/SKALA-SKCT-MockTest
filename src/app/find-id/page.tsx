import Link from "next/link";
import SimpleActionForm from "@/components/SimpleActionForm";
import { requestFindId } from "@/lib/actions/auth";

export default function FindIdPage() {
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-center text-2xl font-bold">아이디 찾기</h1>
      <p className="mt-2 text-center text-sm text-zinc-500">
        가입한 이메일로 인증 링크를 보냅니다.
      </p>
      <SimpleActionForm
        action={requestFindId}
        submitLabel="인증 메일 받기"
        fields={[{ name: "email", type: "email", placeholder: "이메일" }]}
      />
      <Link href="/login" className="mt-4 block text-center text-sm text-red-600">
        로그인으로 돌아가기
      </Link>
    </div>
  );
}
