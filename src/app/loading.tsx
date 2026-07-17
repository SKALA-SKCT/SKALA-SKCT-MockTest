export default function DashboardLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6 md:flex-row md:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card px-5 py-4">
              <div className="h-3 w-24 rounded bg-zinc-200" />
              <div className="mt-3 h-8 w-20 rounded bg-zinc-200" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card p-5">
            <div className="h-4 w-32 rounded bg-zinc-200" />
            <div className="mt-6 h-72 rounded-xl bg-zinc-100" />
          </div>
          <div className="card p-5">
            <div className="h-4 w-28 rounded bg-zinc-200" />
            <div className="mx-auto mt-8 h-64 w-64 rounded-full bg-zinc-100" />
          </div>
        </div>
        <div className="card p-5">
          <div className="h-4 w-24 rounded bg-zinc-200" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-24 rounded-xl bg-zinc-100" />
            ))}
          </div>
        </div>
      </div>
      <aside className="w-full shrink-0 md:w-72 lg:w-80">
        <div className="card p-5">
          <div className="h-4 w-20 rounded bg-zinc-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-zinc-100" />
                <div className="h-4 flex-1 rounded bg-zinc-100" />
                <div className="h-7 w-12 rounded-lg bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
