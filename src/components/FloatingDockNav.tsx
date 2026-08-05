import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Package, Store, ChevronDown, Mic } from "lucide-react";
import { ProfileHubSheet } from "@/components/ProfileHubSheet";
import { getVariantConfig } from "@/lib/app-variant";

/**
 * FloatingDockNav — premium orange dock that rises from the bottom edge.
 *   Left  : square "My Orders" button
 *   Center: big "Digital shope.." pill → opens the Profile hub sheet
 *   Right : round voice / announce button
 */
export function FloatingDockNav({ ordersBadge = 0, shopsBadge = 0 }: { ordersBadge?: number; shopsBadge?: number }) {
  const navigate = useNavigate();
  const [hubOpen, setHubOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const variant = getVariantConfig();

  // Hide the dock while overlays like the vendor-finder radar are open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setHidden(document.body.dataset.finderOpen === "1");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-finder-open"] });
    return () => obs.disconnect();
  }, []);

  if (hidden) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="max-w-md mx-auto px-2 pointer-events-auto">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="relative rounded-t-[26px] bg-gradient-to-b from-[#ff9d2e] to-[#f97316] shadow-[0_-14px_36px_-16px_rgba(249,115,22,0.85)] border-t border-x border-white/40 px-2.5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)]"
          >
            <div className="flex items-center gap-2.5">
              {/* Left — My Orders */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => navigate({ to: variant.dock.left.to as never })}
                aria-label={variant.dock.left.label}
                className="relative shrink-0 h-[54px] w-[54px] rounded-[20px] bg-white/22 backdrop-blur-md border border-white/45 grid place-items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_18px_-10px_rgba(0,0,0,0.5)]"
              >
                <Package className="h-6 w-6 text-white" strokeWidth={2.2} />
                {ordersBadge ? (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-white text-[9px] font-black text-orange-600 grid place-items-center shadow">
                    {ordersBadge > 99 ? "99+" : ordersBadge}
                  </span>
                ) : null}
              </motion.button>

              {/* Center — Digital shop hub */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setHubOpen(true)}
                className="relative flex-1 min-w-0 h-[54px] rounded-[20px] bg-white/18 backdrop-blur-md border border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_18px_-10px_rgba(0,0,0,0.5)] flex items-center gap-2 px-3"
              >
                <Store className="h-6 w-6 shrink-0 text-white" strokeWidth={2.2} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[17px] font-black leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
                    {variant.dock.center.title}
                  </span>
                  <span className="block truncate text-[9.5px] font-semibold text-white/85">
                    {variant.dock.center.sub}
                  </span>
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 text-white/90" />
                {shopsBadge ? (
                  <span className="absolute -top-1 right-2 h-4 min-w-4 px-1 rounded-full bg-white text-[9px] font-black text-orange-600 grid place-items-center shadow">
                    {shopsBadge > 99 ? "99+" : shopsBadge}
                  </span>
                ) : null}
              </motion.button>

              {/* Right — voice / announce */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => window.dispatchEvent(new CustomEvent("ko-open-voice"))}
                aria-label="Voice search"
                className="shrink-0 h-[54px] w-[54px] rounded-full bg-white/22 backdrop-blur-md border border-white/45 grid place-items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_18px_-10px_rgba(0,0,0,0.5)]"
              >
                <Mic className="h-6 w-6 text-white" strokeWidth={2.3} />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      <ProfileHubSheet open={hubOpen} onClose={() => setHubOpen(false)} />
    </>
  );
}
