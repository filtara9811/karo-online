import { MoreVertical, BadgeCheck, MonitorSmartphone } from "lucide-react";
import { needsLightText, withAlpha } from "./landing-shared";

/**
 * Themed identity bar: shop logo + name in the merchant's chosen accent colour.
 * Tapping the avatar opens the merchant profile sheet.
 */
export function LandingTopBar({
  name,
  avatarUrl,
  verified,
  accent,
  onProfile,
  onMenu,
  onInstall,
  installed,
}: {
  name: string;
  avatarUrl?: string | null;
  verified?: boolean;
  accent: string;
  onProfile: () => void;
  onMenu: () => void;
  onInstall?: () => void;
  installed?: boolean;
}) {

  const light = needsLightText(accent);
  const fg = "#ffffff";

  return (
    <div
      className="absolute inset-x-0 top-0 z-40 grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))]"
      style={{
        background: `linear-gradient(180deg, ${withAlpha("#000000", 0.68)}, transparent)`,
        color: fg,
      }}
    >
      <button
        type="button"
        onClick={onProfile}
        aria-label="Shop profile"
        className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 grid place-items-center text-base font-bold transition active:scale-95"
        style={{ borderColor: withAlpha(light ? "#ffffff" : "#000000", 0.55), background: withAlpha(light ? "#ffffff" : "#000000", 0.14), color: fg }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" loading="eager" />
        ) : (
          (name?.[0] ?? "K").toUpperCase()
        )}
      </button>

      <button type="button" onClick={onProfile} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1">
          <span className="truncate font-display text-lg font-bold leading-tight" style={{ color: fg }}>
            {name}
          </span>
          {verified && <BadgeCheck className="h-4 w-4 shrink-0" style={{ color: fg, opacity: 0.9 }} />}
        </div>
        <p className="truncate text-[10px] uppercase tracking-[0.2em]" style={{ color: fg, opacity: 0.75 }}>
          Trusted Karo Merchant
        </p>
      </button>

      {onInstall && !installed && (
        <button
          type="button"
          onClick={onInstall}
          aria-label="Download shop app"
          className="h-9 shrink-0 grid grid-flow-col items-center gap-1 rounded-full border border-emerald-400 px-2.5 text-[10px] font-extrabold transition active:scale-95"
          style={{ background: withAlpha("#000000", 0.34), color: "#4ade80" }}
        >
          <MonitorSmartphone className="h-4 w-4" />
          <span>Download App</span>
        </button>
      )}

      <button

        type="button"
        onClick={onMenu}
        aria-label="More"
        className="h-9 w-9 shrink-0 grid place-items-center rounded-full transition active:scale-95"
        style={{ background: withAlpha(light ? "#ffffff" : "#000000", 0.14), color: fg }}
      >
        <MoreVertical className="h-5 w-5" />
      </button>
    </div>
  );
}
