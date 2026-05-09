import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { EditorProduct } from "@/components/ProductEditor";
import { VendorDashboardCard } from "@/components/VendorDashboardCard";
import { DashboardHistoryFace } from "@/components/DashboardHistoryFace";

/**
 * 3D flippable visiting-card dashboard.
 * - Long-press (~500 ms) flips the card.
 * - Top-right ⟲ button gives a tap-to-flip alternative.
 */
export function DashboardFlipCard({ items }: { items: EditorProduct[] }) {
  const [flipped, setFlipped] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPressStart = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      setFlipped((f) => !f);
    }, 500);
  };
  const onPressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className="flip-3d relative">
      <div
        className={`flip-3d-inner ${flipped ? "is-flipped" : ""}`}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
      >
        {/* Front: live dashboard */}
        <div className="flip-3d-face relative">
          <VendorDashboardCard items={items} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFlipped(true);
            }}
            aria-label="Show history"
            className="absolute top-3.5 right-[88px] h-7 w-7 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.72_0.01_260/0.5)] active:scale-90 z-10"
          >
            <RotateCcw className="h-3 w-3 text-[color:oklch(0.42_0.01_260)]" />
          </button>
        </div>

        {/* Back: history */}
        <div className="flip-3d-face flip-3d-back">
          <DashboardHistoryFace onFlipBack={() => setFlipped(false)} />
        </div>
      </div>
    </div>
  );
}
