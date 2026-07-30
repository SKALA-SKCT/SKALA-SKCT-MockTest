import SimpleActionForm from "@/components/SimpleActionForm";
import { resetPassword } from "@/lib/actions/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-center text-2xl font-bold">비밀번호 재설정</h1>
      <SimpleActionForm
        action={resetPassword}
        submitLabel="비밀번호 변경"
        hidden={{ token }}
        fields={[
          {
            name: "pin",
            type: "password",
            placeholder: "새 비밀번호",
            autoComplete: "new-password",
          },
          {
            name: "pinConfirm",
            type: "password",
            placeholder: "새 비밀번호 확인",
            autoComplete: "new-password",
          },
        ]}
      />
    </div>
  );
}
