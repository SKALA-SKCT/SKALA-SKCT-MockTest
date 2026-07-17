export default function LoginLoading() {
  return (
    <div className="mx-auto mt-24 w-full max-w-sm animate-pulse rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mx-auto h-7 w-32 rounded bg-zinc-200" />
      <div className="mx-auto mt-3 h-4 w-16 rounded bg-zinc-100" />
      <div className="mt-6 space-y-3">
        <div className="h-10 rounded-lg bg-zinc-100" />
        <div className="h-10 rounded-lg bg-zinc-100" />
        <div className="h-10 rounded-lg bg-zinc-200" />
      </div>
    </div>
  );
}
