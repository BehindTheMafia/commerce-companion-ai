export function SkeletonProductPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 w-full border-b border-transparent">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-muted animate-pulse" />
            <div className="h-5 w-24 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="size-9 rounded-full bg-muted animate-pulse" />
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-[1440px] px-5 md:px-8 lg:px-12 py-8 lg:py-12">
          {/* Breadcrumb skeleton */}
          <div className="mb-8 lg:mb-12 flex items-center gap-2">
            <div className="h-3 w-12 rounded bg-muted animate-pulse" />
            <div className="h-3 w-3 rounded bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </div>

          {/* Product grid skeleton */}
          <div className="grid gap-12 lg:gap-16 grid-cols-1 lg:grid-cols-[55fr_45fr]">
            {/* Gallery skeleton */}
            <div>
              <div className="aspect-square w-full rounded-[28px] bg-muted/60 animate-pulse" />
              <div className="mt-3 flex gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="shrink-0 size-24 rounded-2xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            </div>

            {/* Info skeleton */}
            <div className="flex flex-col max-w-[520px]">
              <div className="h-4 w-32 rounded bg-muted animate-pulse mb-4" />
              <div className="h-10 w-3/4 rounded-lg bg-muted animate-pulse mb-3" />
              <div className="h-10 w-1/2 rounded-lg bg-muted animate-pulse mb-4" />
              <div className="h-4 w-full rounded bg-muted/60 animate-pulse mb-2" />
              <div className="h-4 w-2/3 rounded bg-muted/60 animate-pulse mb-8" />
              <div className="h-14 w-full rounded-2xl bg-muted/40 animate-pulse mb-6" />
              <div className="h-14 w-full rounded-2xl bg-muted/40 animate-pulse mb-6" />
              <div className="flex gap-4">
                <div className="h-14 w-30 rounded-full bg-muted/40 animate-pulse" />
                <div className="h-[60px] flex-1 rounded-full bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
