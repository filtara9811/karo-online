import { useEffect, useRef, useState } from "react";
import { X, Minus, Smartphone, RotateCcw, GripHorizontal } from "lucide-react";

type View = "quick" | "home";

const STORAGE_POS = "ko-floating-phone-pos";
const STORAGE_HIDDEN = "ko-floating-phone-hidden";
const STORAGE_MIN = "ko-floating-phone-min";
const STORAGE_VIEW = "ko-floating-phone-view";
const STORAGE_MOBILE_CHOICE = "ko-mobile-entry-choice";

const FRAME_W = 320;
const FRAME_H = 660;

function isMobileUA() {
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
  const [showMobileChoice, setShowMobileChoice] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number; active: boolean }>({ dx: 0, dy: 0, active: false });
  const frameRef = useRef<HTMLDivElement | null>(null);

  // init
  useEffect(() => {
    setMounted(true);
    const mob = isMobileUA();
    setIsMobile(mob);
    if (mob) {
      const choice = localStorage.getItem(STORAGE_MOBILE_CHOICE);
      if (!choice) setShowMobileChoice(true);
      return;
    }
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
        // default: right side, vertically centered
        const x = window.innerWidth - FRAME_W - 24;
        const y = Math.max(24, (window.innerHeight - FRAME_H) / 2);
        setPos({ x, y });
      }
    } catch {}
    const onResize = () => setPos((p) => clampPos(p.x, p.y));
    window.addEventListener("resize", onResize);
    const onMq = () => setIsMobile(isMobileUA());
    const mq = window.matchMedia("(max-width: 1023px)");
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  function clampPos(x: number, y: number) {
    if (typeof window === "undefined") return { x, y };
    const w = minimized ? 64 : FRAME_W;
    const h = minimized ? 64 : FRAME_H;
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
    const next = clampPos(e.clientX - dragRef.current.dx, e.clientY - dragRef.current.dy);
    setPos(next);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      localStorage.setItem(STORAGE_POS, JSON.stringify(pos));
    } catch {}
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

  // MOBILE: show one-time chooser
  if (isMobile) {
    if (!showMobileChoice) return null;
    const choose = (target: "website" | "app") => {
      try { localStorage.setItem(STORAGE_MOBILE_CHOICE, target); } catch {}
      setShowMobileChoice(false);
      if (target === "app") {
        try { localStorage.setItem("ko-entered-app", "true"); } catch {}
        window.location.href = "/quick";
      }
    };
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm p-5">
        <div className="w-full max-w-sm rounded-2xl border border-[#d4af37]/30 bg-[#0f0f0f] p-6 text-white shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl grid place-items-center text-[#1a1208]"
              style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}>
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg leading-tight">Welcome to KaroOnline</h3>
              <p className="text-xs text-white/60">How would you like to continue?</p>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => choose("app")}
              className="w-full py-3 rounded-xl font-semibold text-[#1a1208]"
              style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}
            >
              Open Mobile App
            </button>
            <button
              onClick={() => choose("website")}
              className="w-full py-3 rounded-xl font-medium text-white border border-white/15 hover:bg-white/5"
            >
              Visit Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DESKTOP
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
      style={{ left: pos.x, top: pos.y, width: FRAME_W, height: FRAME_H }}
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
        {/* Drag handle / top bar */}
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
          {/* Notch */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 h-4 w-20 rounded-full bg-black/90" />

          <iframe
            key={view}
            src={view === "quick" ? "/quick" : "/home"}
            title="Karo Online preview"
            className="absolute inset-0 h-full w-full border-0"
            allow="geolocation; clipboard-write"
          />

          {/* Bottom toggle */}
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
