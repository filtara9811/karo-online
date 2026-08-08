/** Lightweight skeleton that mirrors the landing layout — replaces the slow spinner. */
export function LandingSkeleton({ accent = "#f59e0b" }: { accent?: string }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: accent, opacity: 0.9 }}>
        <div className="h-11 w-11 animate-pulse rounded-full bg-white/40" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-2/5 animate-pulse rounded bg-white/45" />
          <div className="h-2 w-1/4 animate-pulse rounded bg-white/30" />
        </div>
        <div className="h-9 w-9 animate-pulse rounded-full bg-white/30" />
      </div>

      <div className="relative h-[62svh] w-full overflow-hidden bg-slate-200">
        <div className="absolute inset-x-3 top-2 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[3px] flex-1 rounded-full bg-white/60" />
          ))}
        </div>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" />
      </div>

      <div className="mt-3 flex gap-2 px-3">
        <div className="h-28 w-[70%] animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-28 w-[24%] animate-pulse rounded-2xl bg-slate-100" />
      </div>

      <div className="fixed inset-x-2 bottom-3 flex gap-2 rounded-full px-3 py-2" style={{ background: accent, opacity: 0.85 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-9 animate-pulse rounded-full bg-white/40" />
        ))}
      </div>
    </div>
  );
}
