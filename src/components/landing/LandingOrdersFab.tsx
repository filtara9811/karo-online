import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { needsLightText, withAlpha } from "./landing-shared";

/**
 * Small floating, semi-transparent and draggable "My Orders" button.
 * Dragging never triggers the tap action.
 */
export function LandingOrdersFab({
  accent,
  count,
  onOpen,
}: {
  accent: string;
  count: number;
  onOpen: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const fg = needsLightText(accent) ? "#ffffff" : "#12100a";

  return (
    <motion.button
      type="button"
      drag
      dragMomentum={false}
      dragElastic={0.12}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => window.setTimeout(() => setDragging(false), 60)}
      whileTap={{ scale: 0.94 }}
      onClick={() => { if (!dragging) onOpen(); }}
      aria-label="My orders"
      className="fixed right-3 top-[38%] z-[120] grid h-12 w-12 place-items-center rounded-full border border-white/40 shadow-lg backdrop-blur-md active:scale-95"
      style={{ background: withAlpha(accent, 0.62), color: fg, touchAction: "none" }}
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-600 px-1 text-[9.5px] font-extrabold text-white shadow">
          {count > 9 ? "9+" : count}
        </span>
      )}
      <span className="pointer-events-none absolute -bottom-4 text-[8.5px] font-extrabold uppercase tracking-wider text-white/90 drop-shadow">
        Orders
      </span>
    </motion.button>
  );
}
