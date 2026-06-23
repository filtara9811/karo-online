// Skeleton placeholders for sub-category cards and root-category rail.
// Used while admin catalog is loading from network/cache.

export function SubCategoryCardSkeleton({ isGrid = false }: { isGrid?: boolean }) {
  if (isGrid) {
    return (
      <div className="rounded-2xl bg-white border-2 border-[color:oklch(0.78_0.14_82/0.2)] p-2 flex flex-col gap-1.5 animate-pulse">
        <div className="h-16 w-full rounded-lg bg-[color:oklch(0.94_0.03_85)]" />
        <div className="h-3 w-3/4 rounded bg-[color:oklch(0.92_0.03_85)]" />
        <div className="h-2.5 w-1/2 rounded bg-[color:oklch(0.94_0.02_85)]" />
        <div className="h-3 w-16 rounded-full bg-[color:oklch(0.94_0.04_140)]" />
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white border-2 border-[color:oklch(0.78_0.14_82/0.2)] p-2.5 flex items-center gap-3 animate-pulse">
      <div className="h-20 w-20 shrink-0 rounded-xl bg-[color:oklch(0.94_0.03_85)]" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3.5 w-2/3 rounded bg-[color:oklch(0.92_0.03_85)]" />
        <div className="h-2.5 w-1/2 rounded bg-[color:oklch(0.94_0.02_85)]" />
        <div className="h-3 w-20 rounded-full bg-[color:oklch(0.94_0.04_140)]" />
      </div>
    </div>
  );
}

export function SubCategoryListSkeleton({ isGrid = false, count = 6 }: { isGrid?: boolean; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SubCategoryCardSkeleton key={i} isGrid={isGrid} />
      ))}
    </>
  );
}

export function RootCategoryRailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 w-full px-1 animate-pulse">
          <div className="h-11 w-11 rounded-full bg-[color:oklch(0.93_0.03_85)] border-2 border-[color:oklch(0.85_0.05_85)]" />
          <div className="h-2 w-8 rounded bg-[color:oklch(0.93_0.03_85)] mt-1" />
        </div>
      ))}
    </>
  );
}
