import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import {
  APP_CATEGORY,
  LINK_CATEGORIES,
  brandOf,
  needsLightText,
  normalizeUrl,
  shade,
  withAlpha,
  type ExtraLink,
  type LinkCategoryKey,
} from "./landing-shared";

export type DockTile = { id: string; label: string; url?: string; onClick?: () => void };

export type DockCategory = {
  key: LinkCategoryKey | "app";
  label: string;
  icon: (typeof LINK_CATEGORIES)[number]["icon"];
  tiles: DockTile[];
  action?: () => void;
};

/** Builds the visible category list from vendor settings — empty ones are hidden. */
export function buildDockCategories({
  extraLinks,
  paymentEnabled,
  paymentUpiId,
  onPayment,
  digitalShopEnabled,
  digitalShopUrl,
  playStoreEnabled,
  playUrl,
}: {
  extraLinks: ExtraLink[];
  paymentEnabled?: boolean;
  paymentUpiId?: string;
  onPayment: () => void;
  digitalShopEnabled?: boolean;
  digitalShopUrl?: string;
  playStoreEnabled?: boolean;
  playUrl: string;
}): DockCategory[] {
  const enabled = extraLinks.filter((l) => l.enabled && (l.url ?? "").trim());
  const out: DockCategory[] = [];

  for (const cat of LINK_CATEGORIES) {
    const tiles: DockTile[] = enabled
      .filter((l) => (l.category ?? "other") === cat.key)
      .map((l) => ({ id: l.id, label: l.label || brandOf(l.url, l.label).name, url: normalizeUrl(l.url) }));

    if (cat.key === "payment") {
      if (paymentEnabled && paymentUpiId) {
        out.push({ key: cat.key, label: cat.label, icon: cat.icon, tiles: [], action: onPayment });
      }
      continue;
    }

    if (cat.key === "shop" && digitalShopEnabled && digitalShopUrl) {
      tiles.unshift({ id: "digital-shop", label: "Digital Shop", url: normalizeUrl(digitalShopUrl) });
    }

    if (tiles.length) out.push({ key: cat.key, label: cat.label, icon: cat.icon, tiles });
  }

  if (playStoreEnabled ?? true) {
    out.push({
      key: "app",
      label: APP_CATEGORY.label,
      icon: APP_CATEGORY.icon,
      tiles: [{ id: "app", label: "Karo Online App", url: playUrl }],
    });
  }

  return out;
}

/** Round category buttons at the bottom + the brand tile rail sheet above it. */
export function LandingCategoryDock({
  categories,
  accent,
}: {
  categories: DockCategory[];
  accent: string;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = categories.find((c) => c.key === activeKey) ?? null;
  const light = needsLightText(accent);
  const fg = light ? "#ffffff" : "#1a1208";

  if (!categories.length) return null;

  return (
    <>
      <AnimatePresence>
        {active && active.tiles.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveKey(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              key={active.key}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="fixed inset-x-2 bottom-[104px] z-50 rounded-3xl border bg-white/95 p-3 shadow-2xl backdrop-blur-md"
              style={{ borderColor: withAlpha(accent, 0.5) }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: shade(accent, -0.3) }}
                >
                  {active.label}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveKey(null)}
                  aria-label="Close"
                  className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {active.tiles.map((t) => {
                  const brand = brandOf(t.url ?? "", t.label);
                  const Icon = brand.icon;
                  return (
                    <a
                      key={t.id}
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-[104px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-sm transition active:scale-95"
                    >
                      <span
                        className="grid h-14 w-14 place-items-center rounded-2xl"
                        style={{ background: withAlpha(brand.color, 0.12), color: brand.color }}
                      >
                        <Icon className="h-8 w-8" />
                      </span>
                      <span className="line-clamp-2 text-center text-[11px] font-semibold leading-tight text-slate-700">
                        {t.label}
                      </span>
                    </a>
                  );
                })}
              </div>
              <p className="pt-1 text-center text-[10px] text-slate-400">Swipe for more · tap to open</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 220, delay: 0.15 }}
        className="fixed inset-x-2 bottom-3 z-50 rounded-full border px-2 py-2 shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${accent}, ${shade(accent, light ? 0.2 : -0.14)})`,
          borderColor: withAlpha(light ? "#ffffff" : "#000000", 0.35),
        }}
      >
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => {
            const Icon = c.icon;
            const isActive = activeKey === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  if (c.action) {
                    c.action();
                    return;
                  }
                  setActiveKey((k) => (k === c.key ? null : String(c.key)));
                }}
                className="flex w-[68px] shrink-0 flex-col items-center gap-1 rounded-full py-1 transition active:scale-95"
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-full transition"
                  style={{
                    background: isActive ? (light ? "#ffffff" : "#1a1208") : withAlpha(light ? "#ffffff" : "#000000", 0.18),
                    color: isActive ? accent : fg,
                    boxShadow: isActive ? `0 0 0 2px ${withAlpha(light ? "#ffffff" : "#000000", 0.45)}` : "none",
                  }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="w-full truncate px-0.5 text-center text-[9px] font-semibold lowercase" style={{ color: fg, opacity: 0.9 }}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

export { ExternalLink };
