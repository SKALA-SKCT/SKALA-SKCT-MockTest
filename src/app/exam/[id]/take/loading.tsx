export default function TakeLoading() {
  return (
    <div className="mx-auto flex max-w-5xl animate-pulse flex-col gap-4 md:flex-row md:items-start">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap gap-1">
          {Array.from({ length: 20 }).map((_, index) => (
            <div key={index} className="h-7 w-7 rounded bg-zinc-200" />
          ))}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-zinc-200" />
            <div className="h-8 w-24 rounded-lg bg-zinc-100" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-zinc-100" />
            <div className="h-4 w-11/12 rounded bg-zinc-100" />
            <div className="h-4 w-10/12 rounded bg-zinc-100" />
            <div className="h-4 w-4/5 rounded bg-zinc-100" />
          </div>
          <div className="mt-6 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 rounded-lg bg-zinc-100" />
            ))}
          </div>
        </div>
      </div>
      <aside className="w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:w-64">
        <div className="h-4 w-40 rounded bg-zinc-200" />
        <div className="mt-4 h-10 rounded-lg bg-zinc-100" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-10 rounded bg-zinc-100" />
          ))}
        </div>
      </aside>
    </div>
  );
}
