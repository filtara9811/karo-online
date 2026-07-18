import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Package, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import avatarUser from "@/assets/avatar-user.png";
import { ProfileHubSheet } from "@/components/ProfileHubSheet";

/**
 * FloatingDockNav — screenshot-style pill dock with 3 slots.
 *   Left: My Orders (dispatches "ko-open-orders")
 *   Center: Profile FAB (opens ProfileHubSheet)
 *   Right: My Shops (navigates to /vendors — digital shop directory)
 *
 * The active slot lifts into a raised circle above the bar with a smooth
 * framer-motion layoutId animation. Tap gives a spring press feedback.
 */
type SlotKey = "orders" | "profile" | "shops";

export function FloatingDockNav({ ordersBadge = 0, shopsBadge = 0 }: { ordersBadge?: number; shopsBadge?: number }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [active, setActive] = useState<SlotKey>("profile");
  const [hubOpen, setHubOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

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


  const trigger = (slot: SlotKey) => {
    setActive(slot);
    if (slot === "orders") {
      setTimeout(() => navigate({ to: "/orders" }), 160);
    } else if (slot === "profile") {
      setHubOpen(true);
    } else {
      setTimeout(() => navigate({ to: "/vendors" }), 160);
    }
  };

  return (
    <>
      <div
        className="fixed inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] pointer-events-none"
        style={{ bottom: 8 }}
      >
        <div className="max-w-md mx-auto px-4 pointer-events-auto">
          <div className="relative">
            {/* the dark pill bar */}
            <div className="relative h-16 rounded-full bg-gradient-to-b from-[#151515] to-[#0a0a0a] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.6)] border border-white/5">
              <div className="absolute inset-0 grid grid-cols-3 items-center">
                <Slot
                  slot="orders"
                  active={active === "orders"}
                  onClick={() => trigger("orders")}
                  badge={ordersBadge}
                >
                  <Package className="h-5 w-5" strokeWidth={2.3} />
                  <span className="text-[10px] font-semibold mt-0.5">My Orders</span>
                </Slot>

                {/* center placeholder — FAB sits above via absolute */}
                <div />

                <Slot
                  slot="shops"
                  active={active === "shops"}
                  onClick={() => trigger("shops")}
                  badge={shopsBadge}
                >
                  <Store className="h-5 w-5" strokeWidth={2.3} />
                  <span className="text-[10px] font-semibold mt-0.5">My Shops</span>
                </Slot>
              </div>
            </div>

            {/* Center raised profile FAB */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => trigger("profile")}
              aria-label="Open menu"
              className="absolute left-1/2 -translate-x-1/2 -top-3 h-14 w-14 rounded-full bg-white p-1 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)] active:shadow-md"
            >
              <span className="block h-full w-full rounded-full overflow-hidden ring-2 ring-white bg-gradient-to-br from-amber-300 to-orange-500">
                <img
                  src={profile?.avatar_url || avatarUser}
                  alt=""
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarUser; }}
                  className="h-full w-full object-cover"
                />
              </span>
              {active === "profile" && (
                <motion.span
                  layoutId="dock-active-ring"
                  className="absolute inset-0 rounded-full ring-2 ring-amber-400 pointer-events-none"
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <ProfileHubSheet open={hubOpen} onClose={() => { setHubOpen(false); }} />
    </>
  );
}

function Slot({
  active, onClick, children, badge,
}: {
  slot: SlotKey;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="relative h-full flex flex-col items-center justify-center gap-0"
    >
      {/* Animated selection blob */}
      {active && (
        <motion.span
          layoutId="dock-active-blob"
          className="absolute inset-y-2 inset-x-3 rounded-full bg-gradient-to-b from-amber-400/25 to-amber-500/10 border border-amber-300/40"
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        />
      )}
      <span className={`relative z-10 flex flex-col items-center transition-colors ${active ? "text-amber-300" : "text-white/85"}`}>
        {children}
      </span>
      {badge ? (
        <span className="absolute top-1.5 right-6 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white grid place-items-center shadow">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </motion.button>
  );
}
