export default function AppLoading() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center pb-24">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-zinc-200 bg-white px-8 py-10 text-center shadow-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-brand" />
        <p className="mt-4 text-sm font-semibold text-ink">불러오는 중입니다.</p>
      </div>
    </div>
  );
}
