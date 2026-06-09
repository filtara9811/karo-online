import { useEffect, useRef, useState } from "react";
import { X, Minus, Smartphone, RotateCcw, GripHorizontal, ExternalLink } from "lucide-react";

type View = "quick" | "home";

const STORAGE_POS = "ko-floating-phone-pos";
const STORAGE_HIDDEN = "ko-floating-phone-hidden";
const STORAGE_MIN = "ko-floating-phone-min";
const STORAGE_VIEW = "ko-floating-phone-view";

const FRAME_W = 320;
const FRAME_H = 660;

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

export function FloatingPhoneMockup() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [view, setView] = useState<View>("quick");
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ dx: number; dy: number; active: boolean }>({ dx: 0, dy: 0, active: false });
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const updateMobile = () => setIsMobile(isMobileViewport());
    updateMobile();

    try {
      setHidden(localStorage.getItem(STORAGE_HIDDEN) === "1");
      setMinimized(localStorage.getItem(STORAGE_MIN) === "1");
      const v = localStorage.getItem(STORAGE_VIEW) as View | null;
      if (v === "home" || v === "quick") setView(v);
      const saved = localStorage.getItem(STORAGE_POS);
      if (saved) {
        const p = JSON.parse(saved);
        setPos(clampPos(p.x, p.y));
      } else {
        // default position: right side, vertically centered on desktop;
        // horizontally centered near top on mobile
        if (isMobileViewport()) {
          const scale = getMobileScale();
          const w = FRAME_W * scale;
          const x = Math.max(8, (window.innerWidth - w) / 2);
          const y = 96;
          setPos({ x, y });
        } else {
          const x = window.innerWidth - FRAME_W - 24;
          const y = Math.max(24, (window.innerHeight - FRAME_H) / 2);
          setPos({ x, y });
        }
      }
    } catch {}

    const onResize = () => {
      updateMobile();
      setPos((p) => clampPos(p.x, p.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function getMobileScale() {
    if (typeof window === "undefined") return 1;
    // Fit frame within ~88% of viewport width on mobile
    const maxW = Math.min(window.innerWidth * 0.88, 360);
    const maxH = window.innerHeight * 0.72;
    return Math.min(maxW / FRAME_W, maxH / FRAME_H, 1);
  }

  function clampPos(x: number, y: number) {
    if (typeof window === "undefined") return { x, y };
    const scale = isMobileViewport() ? getMobileScale() : 1;
    const w = minimized ? 64 : FRAME_W * scale;
    const h = minimized ? 64 : FRAME_H * scale;
    const maxX = window.innerWidth - w - 8;
    const maxY = window.innerHeight - h - 8;
    return { x: Math.min(Math.max(8, x), Math.max(8, maxX)), y: Math.min(Math.max(8, y), Math.max(8, maxY)) };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!frameRef.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const rect = frameRef.current.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, active: true };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    setPos(clampPos(e.clientX - dragRef.current.dx, e.clientY - dragRef.current.dy));
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try { localStorage.setItem(STORAGE_POS, JSON.stringify(pos)); } catch {}
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  function persistHidden(v: boolean) {
    setHidden(v);
    try { localStorage.setItem(STORAGE_HIDDEN, v ? "1" : "0"); } catch {}
  }
  function persistMin(v: boolean) {
    setMinimized(v);
    try { localStorage.setItem(STORAGE_MIN, v ? "1" : "0"); } catch {}
  }
  function persistView(v: View) {
    setView(v);
    try { localStorage.setItem(STORAGE_VIEW, v); } catch {}
  }

  if (!mounted) return null;

  const scale = isMobile ? getMobileScale() : 1;

  if (hidden) {
    return (
      <button
        onClick={() => persistHidden(false)}
        className="fixed bottom-6 right-6 z-[90] h-12 w-12 rounded-full grid place-items-center text-[#1a1208] shadow-lg hover:scale-105 transition"
        style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}
        title="Open phone preview"
      >
        <Smartphone className="h-5 w-5" />
      </button>
    );
  }

  if (minimized) {
    return (
      <div
        ref={frameRef}
        className="fixed z-[90] h-16 w-16 rounded-2xl grid place-items-center text-[#1a1208] shadow-xl cursor-grab active:cursor-grabbing"
        style={{
          left: pos.x, top: pos.y,
          background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => persistMin(false)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); persistMin(false); }}
          className="h-full w-full grid place-items-center"
          title="Expand phone"
        >
          <Smartphone className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      className="fixed z-[90] select-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: FRAME_W,
        height: FRAME_H,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
      }}
    >
      {/* Phone bezel */}
      <div
        className="relative h-full w-full rounded-[44px] p-3 shadow-2xl"
        style={{
          background: "linear-gradient(160deg,#1a1a1a,#0a0a0a)",
          border: "2px solid #2a2a2a",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.15)",
        }}
      >
        {/* Drag handle */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1a1a1a]/95 border border-[#d4af37]/30 cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          title="Drag to move"
        >
          <GripHorizontal className="h-3.5 w-3.5 text-[#d4af37]" />
          <span className="text-[10px] uppercase tracking-widest text-white/60">Karo Online</span>
        </div>

        {/* Controls */}
        <div className="absolute -top-2 right-3 z-10 flex items-center gap-1.5">
          <a
            href="/quick"
            className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:text-white hover:border-[#d4af37]/60"
            title="Open app full screen"
            onClick={() => { try { localStorage.setItem("ko-entered-app", "true"); } catch {} }}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={() => persistMin(true)}
            className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:text-white hover:border-[#d4af37]/50"
            title="Minimize"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            onClick={() => persistHidden(true)}
            className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:text-white hover:border-red-400/60"
            title="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Screen */}
        <div className="relative h-full w-full rounded-[34px] overflow-hidden bg-white">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 h-4 w-20 rounded-full bg-black/90" />
          <iframe
            key={view}
            src={view === "quick" ? "/quick?web=1" : "/home?web=1"}
            title="Karo Online preview"
            className="absolute inset-0 h-full w-full border-0"
            allow="geolocation; clipboard-write"
          />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 rounded-full bg-black/80 backdrop-blur border border-white/10">
            <button
              onClick={() => persistView("quick")}
              className={`px-3 py-1 text-[11px] rounded-full font-medium transition ${
                view === "quick" ? "text-[#1a1208]" : "text-white/70 hover:text-white"
              }`}
              style={view === "quick" ? { background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" } : undefined}
            >
              Quick Service
            </button>
            <button
              onClick={() => persistView("home")}
              className={`px-3 py-1 text-[11px] rounded-full font-medium transition ${
                view === "home" ? "text-[#1a1208]" : "text-white/70 hover:text-white"
              }`}
              style={view === "home" ? { background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" } : undefined}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                const f = frameRef.current?.querySelector("iframe");
                if (f) (f as HTMLIFrameElement).src = (f as HTMLIFrameElement).src;
              }}
              className="ml-0.5 h-6 w-6 rounded-full grid place-items-center text-white/70 hover:text-white"
              title="Reload"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
