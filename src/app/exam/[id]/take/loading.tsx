export default function TakeLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white px-6 py-7 text-center shadow-xl">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-brand" />
        <p className="mt-4 text-base font-bold text-ink">시험을 준비중입니다.</p>
        <p className="mt-1 text-sm text-ink-3">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}
