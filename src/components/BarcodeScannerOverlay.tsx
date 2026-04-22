import { useEffect, useRef, useState } from "react";
import {
  X,
  Zap,
  ZapOff,
  RefreshCw,
  ScanBarcode,
  Check,
  Keyboard,
} from "lucide-react";
import type { EditorProduct } from "@/components/ProductEditor";

/**
 * Full-screen presentational scanner overlay.
 * - Animated viewfinder with green laser line
 * - Mock-resolves a random product after ~1.2s
 * - Manual barcode entry fallback
 * - Running tally of scanned items
 */
export function BarcodeScannerOverlay({
  products,
  onScan,
  onClose,
}: {
  products: EditorProduct[];
  onScan: (p: EditorProduct) => void;
  onClose: () => void;
}) {
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState("");
  const [scanned, setScanned] = useState<{ name: string; price: number }[]>([]);
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Mock scanner: every ~3.5s pretend to find a product
  useEffect(() => {
    if (manual || products.length === 0) return;
    const tick = () => {
      const pick = products[Math.floor(Math.random() * products.length)];
      setPulse(true);
      setTimeout(() => setPulse(false), 350);
      onScan(pick);
      setScanned((prev) => [
        ...prev,
        { name: pick.name, price: pick.price ?? 0 },
      ]);
    };
    const id = setInterval(tick, 3500);
    return () => clearInterval(id);
  }, [manual, products, onScan]);

  const submitManual = () => {
    if (!code.trim()) return;
    const found = products.find(
      (p) =>
        p.id.toLowerCase() === code.trim().toLowerCase() ||
        p.name.toLowerCase().includes(code.trim().toLowerCase())
    );
    if (found) {
      onScan(found);
      setScanned((prev) => [
        ...prev,
        { name: found.name, price: found.price ?? 0 },
      ]);
    } else if (products.length > 0) {
      // Fallback: pick first as a demo
      const f = products[0];
      onScan(f);
      setScanned((prev) => [...prev, { name: f.name, price: f.price ?? 0 }]);
    }
    setCode("");
  };

  const total = scanned.reduce((s, x) => s + x.price, 0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: "radial-gradient(ellipse at center, #0a0a0a, #000 70%)" }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-3">
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="h-10 w-10 grid place-items-center rounded-full bg-white/10 backdrop-blur border border-white/20 active:scale-90"
        >
          <X className="h-5 w-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/70 font-bold">
            ✦ Scan Mode ✦
          </span>
        </div>
        <button
          onClick={() => setTorch((t) => !t)}
          aria-label="Toggle torch"
          className="h-10 w-10 grid place-items-center rounded-full bg-white/10 backdrop-blur border border-white/20 active:scale-90"
        >
          {torch ? (
            <Zap className="h-5 w-5 text-amber-300" />
          ) : (
            <ZapOff className="h-5 w-5 text-white/70" />
          )}
        </button>
      </header>

      {/* Viewfinder */}
      <div className="flex-1 grid place-items-center px-6">
        <div
          className={`relative w-full max-w-xs aspect-square rounded-3xl overflow-hidden border-2 border-[#d4af37]/60 ${
            pulse ? "ring-4 ring-emerald-400/60" : ""
          } transition`}
          style={{
            background: torch
              ? "radial-gradient(circle at center, rgba(255, 240, 200, 0.15), transparent 65%)"
              : "rgba(255,255,255,0.03)",
            boxShadow:
              "0 0 0 1px rgba(212,175,55,0.3), inset 0 0 60px rgba(212,175,55,0.15)",
          }}
        >
          {/* Corner brackets */}
          <Bracket pos="top-left" />
          <Bracket pos="top-right" />
          <Bracket pos="bottom-left" />
          <Bracket pos="bottom-right" />

          {/* Animated laser */}
          {!manual && (
            <div className="absolute inset-x-6 top-6 h-0.5 bg-emerald-400 scanner-laser" />
          )}

          {/* Center icon */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <ScanBarcode className="h-16 w-16 text-white/15" strokeWidth={1.4} />
          </div>

          {/* Scan tip */}
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-bold">
              Align barcode in frame
            </p>
          </div>
        </div>

        {/* Manual input */}
        {manual && (
          <div className="mt-4 w-full max-w-xs flex items-center gap-2">
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter barcode / SKU"
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
              className="flex-1 h-11 px-4 rounded-full bg-white/95 border border-[#d4af37] text-sm font-bold text-black focus:outline-none"
            />
            <button
              onClick={submitManual}
              className="h-11 px-4 rounded-full font-display font-bold text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
              style={{
                background: "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37)",
              }}
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] space-y-3">
        {/* Tally */}
        {scanned.length > 0 && (
          <div
            className="rounded-2xl border border-[#d4af37]/60 bg-white/95 px-3 py-2 flex items-center justify-between"
            style={{ animation: "fade-up 0.3s ease-out" }}
          >
            <div>
              <p className="font-display text-xs text-gold-gradient font-bold leading-tight">
                {scanned.length} item{scanned.length > 1 ? "s" : ""} added
              </p>
              <p className="text-[10px] text-[color:oklch(0.45_0.08_85)] truncate max-w-[180px]">
                Last: {scanned[scanned.length - 1].name}
              </p>
            </div>
            <span className="font-display text-base text-gold-gradient font-bold tabular-nums">
              ₹{total.toLocaleString()}
            </span>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setManual((m) => !m)}
            aria-label="Manual entry"
            className="h-12 w-12 grid place-items-center rounded-full bg-white/10 backdrop-blur border border-white/20 active:scale-90"
          >
            <Keyboard className="h-5 w-5 text-white" />
          </button>

          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-full font-display font-bold text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
            style={{
              background:
                "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37, #8b6508)",
            }}
          >
            Done · {scanned.length > 0 ? `Bill ₹${total.toLocaleString()}` : "Close"}
          </button>

          <button
            onClick={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            aria-label="Flip camera"
            className="h-12 w-12 grid place-items-center rounded-full bg-white/10 backdrop-blur border border-white/20 active:scale-90"
          >
            <RefreshCw className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bracket({
  pos,
}: {
  pos: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const base = "absolute h-7 w-7 border-[#d4af37]";
  const map: Record<string, string> = {
    "top-left": "top-2 left-2 border-t-2 border-l-2 rounded-tl-xl",
    "top-right": "top-2 right-2 border-t-2 border-r-2 rounded-tr-xl",
    "bottom-left": "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-xl",
    "bottom-right": "bottom-2 right-2 border-b-2 border-r-2 rounded-br-xl",
  };
  return <span className={`${base} ${map[pos]}`} />;
}
