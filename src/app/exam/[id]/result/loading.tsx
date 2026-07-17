export default function ResultLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-4 w-20 rounded bg-zinc-200" />
        <div className="mt-3 h-8 w-72 rounded bg-zinc-200" />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mx-auto h-3 w-16 rounded bg-zinc-200" />
            <div className="mx-auto mt-3 h-8 w-20 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-36 rounded bg-zinc-200" />
          <div className="mx-auto mt-8 h-72 w-72 rounded-full bg-zinc-100" />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-24 rounded bg-zinc-200" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-8 rounded bg-zinc-100" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="h-5 w-40 rounded bg-zinc-200" />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-64 rounded-xl bg-zinc-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
