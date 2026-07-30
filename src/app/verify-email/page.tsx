import Link from "next/link";
import { verifyEmailToken } from "@/lib/actions/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : { ok: false };

  return (
    <div className="mx-auto mt-24 max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold">이메일 인증</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        {result.ok
          ? "이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다."
          : "유효하지 않거나 만료된 인증 링크입니다."}
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
      >
        로그인으로 이동
      </Link>
    </div>
  );
}
