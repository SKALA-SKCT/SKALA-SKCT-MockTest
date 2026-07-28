import Link from "next/link";
import { consumeFindIdToken } from "@/lib/actions/auth";

export default async function FindIdResultPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const nicknames = token ? await consumeFindIdToken(token) : null;
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold">아이디 찾기</h1>
      {nicknames && nicknames.length > 0 ? (
        <div className="mt-5 rounded-xl bg-zinc-50 px-4 py-3 text-left">
          {nicknames.map((nickname) => (
            <p key={nickname} className="font-semibold text-zinc-800">
              {nickname}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          유효하지 않거나 만료된 링크입니다.
        </p>
      )}
      <Link href="/login" className="mt-6 inline-block text-sm text-red-600">
        로그인으로 돌아가기
      </Link>
    </div>
  );
}
