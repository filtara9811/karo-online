import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type SheetEntry = { id: number; node: ReactNode };

type Ctx = {
  push: (node: ReactNode) => void;
  pop: () => void;
  popAll: () => void;
  depth: number;
};

const SheetStackContext = createContext<Ctx | null>(null);

export function useSheetStack() {
  const ctx = useContext(SheetStackContext);
  if (!ctx) throw new Error("useSheetStack must be used inside <SheetStackProvider />");
  return ctx;
}

export function SheetStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SheetEntry[]>([]);

  const push = useCallback((node: ReactNode) => {
    setStack((prev) => [...prev, { id: Date.now() + Math.random(), node }]);
  }, []);
  const pop = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);
  const popAll = useCallback(() => setStack([]), []);

  // Body scroll lock while any sheet is open
  useEffect(() => {
    if (stack.length === 0) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [stack.length]);

  // Escape closes top sheet
  useEffect(() => {
    if (stack.length === 0) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") pop(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stack.length, pop]);

  return (
    <SheetStackContext.Provider value={{ push, pop, popAll, depth: stack.length }}>
      {children}
      {stack.length > 0 && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop — clicking closes only the TOP sheet */}
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            style={{ animation: "fade-in 0.2s ease-out" }}
            onClick={pop}
          />
          {stack.map((s, i) => {
            const isTop = i === stack.length - 1;
            // Each stacked sheet sits a bit lower so the one beneath peeks
            const peekOffset = (stack.length - 1 - i) * 10; // px from top
            return (
              <div
                key={s.id}
                className="absolute inset-x-0 bottom-0 mx-auto max-w-md"
                style={{
                  top: `calc(env(safe-area-inset-top) + ${peekOffset}px + 4vh)`,
                  zIndex: 10 + i,
                  pointerEvents: isTop ? "auto" : "none",
                }}
              >
                <div
                  className="relative h-full w-full bg-white rounded-t-[28px] overflow-hidden flex flex-col shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.35)] border-t-2 border-x border-[color:oklch(0.78_0.14_82/0.45)]"
                  style={{
                    animation: isTop ? "sheet-slide-up 0.32s cubic-bezier(0.22,1,0.36,1)" : undefined,
                    transform: isTop ? undefined : "scale(0.985)",
                    transition: "transform 0.25s ease",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Drag handle */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-[color:oklch(0.78_0.14_82/0.5)] z-10 pointer-events-none" />
                  {/* X close button — prominent, top-right corner */}
                  <button
                    onClick={pop}
                    aria-label="Close"
                    className="absolute top-2.5 right-2.5 z-20 h-9 w-9 grid place-items-center rounded-full bg-white/95 border border-[color:oklch(0.78_0.14_82/0.55)] shadow-md active:scale-90 text-[color:oklch(0.22_0.05_85)]"
                  >
                    <X className="h-5 w-5" strokeWidth={2.4} />
                  </button>
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                    {s.node}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes sheet-slide-up {
          from { transform: translateY(8%); opacity: 0.5; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </SheetStackContext.Provider>
  );
}
