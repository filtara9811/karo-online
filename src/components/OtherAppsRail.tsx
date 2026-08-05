import { ExternalLink } from "lucide-react";
import { otherApps } from "@/lib/app-variant";

/**
 * OtherAppsRail — cross-app promotion. Each module ships as its own Play Store
 * app; this rail links to the siblings of the current variant.
 */
export function OtherAppsRail() {
  const apps = otherApps();
  if (!apps.length) return null;
  return (
    <div className="mt-3">
      <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Our other apps
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {apps.map((a) => (
          <a
            key={a.id}
            href={a.playUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/70 backdrop-blur px-3 py-2"
          >
            <span
              className="h-7 w-7 rounded-lg border border-white/40"
              style={{ background: a.themeColor }}
              aria-hidden
            />
            <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{a.appName}</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        ))}
      </div>
    </div>
  );
}
