export default function RingDetailLoading() {
  return (
    <div className="space-y-5" aria-hidden>
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="h-4 w-28 animate-pulse rounded bg-gray-800" />

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-xl space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-800" />
            <div className="h-8 w-56 animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-full animate-pulse rounded bg-gray-800" />
          </div>

          <div className="w-48 space-y-2 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
            <div className="h-3 w-16 animate-pulse rounded bg-gray-800" />
            <div className="h-4 w-40 animate-pulse rounded bg-gray-800" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="space-y-3">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-800" />
          <div className="h-4 w-56 animate-pulse rounded bg-gray-800" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="space-y-2 rounded-lg border border-gray-800 bg-gray-950 px-3 py-3"
            >
              <div className="h-3 w-16 animate-pulse rounded bg-gray-800" />
              <div className="h-5 w-24 animate-pulse rounded bg-gray-800" />
              <div className="h-3 w-20 animate-pulse rounded bg-gray-800" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="space-y-3">
            <div className="h-5 w-36 animate-pulse rounded bg-gray-800" />
            <div className="h-4 w-72 animate-pulse rounded bg-gray-800" />
          </div>
          <div className="mt-6 h-[320px] animate-pulse rounded-xl border border-gray-800 bg-gray-950" />
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-800" />
            <div className="h-4 w-52 animate-pulse rounded bg-gray-800" />
          </div>
          <div className="mt-6 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-lg border border-gray-800 bg-gray-950"
              />
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="space-y-3">
          <div className="h-5 w-36 animate-pulse rounded bg-gray-800" />
          <div className="h-4 w-80 animate-pulse rounded bg-gray-800" />
        </div>
        <div className="mt-6 space-y-4">
          <div className="h-24 animate-pulse rounded-lg border border-gray-800 bg-gray-950" />
          <div className="h-24 animate-pulse rounded-lg border border-gray-800 bg-gray-950" />
        </div>
      </section>
    </div>
  );
}
