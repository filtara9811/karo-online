import { motion } from "framer-motion";
import { brandOf, needsLightText, normalizeUrl, withAlpha, type ExtraLink } from "./landing-shared";

/**
 * Chat-style landing body (WhatsApp Business look):
 * welcome bubbles + a tappable service tile grid built from the merchant links.
 */
export function LandingChatWelcome({
  accent,
  name,
  links,
}: {
  accent: string;
  name: string;
  links: ExtraLink[];
}) {
  const tiles = links.filter((l) => l.enabled && l.url).slice(0, 9);
  const bubbleFg = needsLightText(accent) ? "#ffffff" : "#12200f";

  return (
    <div className="px-3 pt-3 space-y-2.5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-[86%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm"
        style={{ background: withAlpha(accent, 0.14) }}
      >
        <p className="text-[13px] font-bold text-slate-900">👋 Welcome to {name}!</p>
        <p className="text-[12px] text-slate-600">How can we help you today?</p>
      </motion.div>

      {tiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.06 }}
          className="rounded-2xl border border-black/10 bg-white/90 p-3 shadow-sm backdrop-blur"
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Our services</p>
          <div className="grid grid-cols-3 gap-2">
            {tiles.map((l) => {
              const brand = brandOf(l.url, l.label);
              const Icon = brand.icon;
              return (
                <a
                  key={l.id}
                  href={normalizeUrl(l.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/5 bg-white px-1.5 py-3 text-center shadow-sm active:scale-95"
                >
                  <span
                    className="grid h-9 w-9 place-items-center rounded-xl"
                    style={{ background: withAlpha(brand.color, 0.14), color: brand.color }}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="line-clamp-1 text-[10.5px] font-semibold text-slate-700">{l.label}</span>
                </a>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-right shadow-sm"
        style={{ background: accent, color: bubbleFg }}
      >
        <p className="text-[12.5px] font-semibold">Neeche se category chunkar turant connect karein ✅</p>
      </motion.div>
    </div>
  );
}
