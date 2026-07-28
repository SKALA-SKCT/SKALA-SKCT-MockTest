import Link from "next/link";

export default async function VerifyEmailSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold">인증 메일 발송</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        {email ? `${email}로 ` : ""}인증 링크를 보냈습니다.
        <br />
        메일의 링크를 눌러 가입을 완료해주세요.
      </p>
      <Link href="/login" className="mt-6 inline-block text-sm text-red-600">
        로그인으로 이동
      </Link>
    </div>
  );
}
