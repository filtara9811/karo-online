import { MoreVertical, BadgeCheck } from "lucide-react";
import { needsLightText, shade, withAlpha } from "./landing-shared";

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
}: {
  name: string;
  avatarUrl?: string | null;
  verified?: boolean;
  accent: string;
  onProfile: () => void;
  onMenu: () => void;
}) {
  const light = needsLightText(accent);
  const fg = light ? "#ffffff" : "#1a1208";

  return (
    <div
      className="sticky top-0 z-40 flex items-center gap-3 px-3 py-2.5 shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${accent}, ${shade(accent, light ? 0.18 : -0.12)})`,
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
