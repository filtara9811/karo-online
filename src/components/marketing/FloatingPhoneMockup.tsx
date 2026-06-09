import { useEffect, useRef, useState } from "react";
import {
  X, Minus, Smartphone, RotateCcw, GripHorizontal, ExternalLink,
  ZoomIn, ZoomOut, Maximize2,
} from "lucide-react";

type View = "app" | "quick" | "home" | "vendor" | "admin";

const STORAGE_POS = "ko-floating-phone-pos";
const STORAGE_HIDDEN = "ko-floating-phone-hidden";
const STORAGE_MIN = "ko-floating-phone-min";
const STORAGE_VIEW = "ko-floating-phone-view";
const STORAGE_ZOOM = "ko-floating-phone-zoom";

// Base intrinsic device size. Final on-screen size = base * scale.
const FRAME_W = 300;
const FRAME_H = 620;

const ZOOM_MIN = 0.55;
const ZOOM_MAX = 1.4;
const ZOOM_STEP = 0.1;

function viewportSize() {
  if (typeof window === "undefined") return { w: 1024, h: 768 };
  return { w: window.innerWidth, h: window.innerHeight };
}

// Fit-to-viewport scale so frame never overflows.
function fitScale() {
  const { w, h } = viewportSize();
  const maxW = Math.min(w * 0.92, 380);
  const maxH = h * 0.86;
  return Math.min(maxW / FRAME_W, maxH / FRAME_H, 1.4);
}

export function FloatingPhoneMockup() {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [view, setView] = useState<View>("app");
  const [zoom, setZoom] = useState<number>(1);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ dx: number; dy: number; active: boolean }>({ dx: 0, dy: 0, active: false });
  const frameRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  // currentScale = user zoom * fitScale baseline, clamped
  function currentScale(z = zoom) {
    const base = fitScale();
    return Math.max(0.3, Math.min(z * base, ZOOM_MAX));
  }

  function clampPos(x: number, y: number, z = zoom, isMin = minimized) {
    const { w, h } = viewportSize();
    const s = currentScale(z);
    const W = isMin ? 64 : FRAME_W * s;
    const H = isMin ? 64 : FRAME_H * s;
    const maxX = Math.max(8, w - W - 8);
    const maxY = Math.max(8, h - H - 8);
    return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
  }

  useEffect(() => {
    setMounted(true);
    try {
      setHidden(localStorage.getItem(STORAGE_HIDDEN) === "1");
      setMinimized(localStorage.getItem(STORAGE_MIN) === "1");
      const v = localStorage.getItem(STORAGE_VIEW) as View | null;
      if (v === "app" || v === "quick" || v === "home" || v === "vendor" || v === "admin") setView(v);
      const z = parseFloat(localStorage.getItem(STORAGE_ZOOM) || "1");
      const initZ = isFinite(z) ? Math.max(ZOOM_MIN, Math.min(z, ZOOM_MAX)) : 1;
      setZoom(initZ);

      const saved = localStorage.getItem(STORAGE_POS);
      const { w, h } = viewportSize();
      const s = Math.max(0.3, Math.min(initZ * fitScale(), ZOOM_MAX));
      if (saved) {
        const p = JSON.parse(saved);
        setPos(clampPos(p.x, p.y, initZ));
      } else {
        // default: right side on desktop, centered on small screens
        if (w >= 1024) {
          const x = w - FRAME_W * s - 24;
          const y = Math.max(16, (h - FRAME_H * s) / 2);
          setPos(clampPos(x, y, initZ));
        } else {
          const x = (w - FRAME_W * s) / 2;
          const y = 72;
          setPos(clampPos(x, y, initZ));
        }
      }
    } catch {}

    const onResize = () => setPos((p) => clampPos(p.x, p.y));
    const onOpen = () => {
      try {
        localStorage.setItem(STORAGE_HIDDEN, "0");
        localStorage.setItem(STORAGE_MIN, "0");
      } catch {}
      setHidden(false);
      setMinimized(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("ko-open-phone", onOpen as EventListener);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("ko-open-phone", onOpen as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-clamp when zoom/minimized changes
  useEffect(() => {
    setPos((p) => clampPos(p.x, p.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, minimized]);

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
    try { localStorage.setItem(STORAGE_POS, JSON.stringify(posRef.current)); } catch {}
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
  function persistZoom(z: number) {
    const c = Math.max(ZOOM_MIN, Math.min(z, ZOOM_MAX));
    setZoom(c);
    try { localStorage.setItem(STORAGE_ZOOM, String(c)); } catch {}
  }

  if (!mounted) return null;

  const scale = currentScale();
  // Inside-frame UI scale: keep iframe content readable when zoomed out
  // by counter-scaling slightly; cap so it doesn't get too tiny.
  const iframeSrc =
    view === "app" ? "/register?web=1&embed=1"
      : view === "quick" ? "/quick?web=1&embed=1"
      : view === "vendor" ? "/vendor/dashboard?web=1&embed=1"
      : view === "admin" ? "/admin?web=1&embed=1"
      : "/home?web=1&embed=1";

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
        title="Drag — double-click to expand"
      >
        <Smartphone className="h-6 w-6" />
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
        width: FRAME_W * scale,
        height: FRAME_H * scale,
      }}
    >
      <div
        style={{
          width: FRAME_W,
          height: FRAME_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        {/* Phone bezel */}
        <div
          className="relative h-full w-full rounded-[40px] p-2.5 shadow-2xl"
          style={{
            background: "linear-gradient(160deg,#1a1a1a,#0a0a0a)",
            border: "2px solid #2a2a2a",
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.18)",
          }}
        >
          {/* Drag handle */}
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-3 py-1 rounded-full bg-[#1a1a1a]/95 border border-[#d4af37]/30 cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            title="Drag to move"
          >
            <GripHorizontal className="h-3.5 w-3.5 text-[#d4af37]" />
            <span className="text-[10px] uppercase tracking-widest text-white/60">
              Karo Online
            </span>
          </div>

          {/* Top-right controls */}
          <div className="absolute -top-2 right-2 z-20 flex items-center gap-1">
            <button
              onClick={() => persistZoom(zoom - ZOOM_STEP)}
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:text-white hover:border-[#d4af37]/60"
              title="Zoom out"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <button
              onClick={() => persistZoom(zoom + ZOOM_STEP)}
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:text-white hover:border-[#d4af37]/60"
              title="Zoom in"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
            <button
              onClick={() => persistZoom(1)}
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:text-white hover:border-[#d4af37]/60"
              title="Reset zoom"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <a
              href={view === "app" ? "/register" : view === "quick" ? "/quick" : "/home"}
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:text-white hover:border-[#d4af37]/60"
              title="Open full screen"
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
          <div className="relative h-full w-full rounded-[32px] overflow-hidden bg-white">
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 h-4 w-20 rounded-full bg-black/90" />
            <iframe
              key={view}
              src={iframeSrc}
              title="Karo Online preview"
              className="absolute inset-0 h-full w-full border-0"
              allow="geolocation; clipboard-write; camera; microphone"
            />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 rounded-full bg-black/85 backdrop-blur border border-white/10">
              <button
                onClick={() => persistView("app")}
                className={`px-2.5 py-0.5 text-[10px] rounded-full font-medium transition ${
                  view === "app" ? "text-[#1a1208]" : "text-white/70 hover:text-white"
                }`}
                style={view === "app" ? { background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" } : undefined}
              >
                App
              </button>
              <button
                onClick={() => persistView("quick")}
                className={`px-2.5 py-0.5 text-[10px] rounded-full font-medium transition ${
                  view === "quick" ? "text-[#1a1208]" : "text-white/70 hover:text-white"
                }`}
                style={view === "quick" ? { background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" } : undefined}
              >
                Quick
              </button>
              <button
                onClick={() => persistView("home")}
                className={`px-2.5 py-0.5 text-[10px] rounded-full font-medium transition ${
                  view === "home" ? "text-[#1a1208]" : "text-white/70 hover:text-white"
                }`}
                style={view === "home" ? { background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" } : undefined}
              >
                Home
              </button>
              <button
                onClick={() => {
                  const f = frameRef.current?.querySelector("iframe");
                  if (f) (f as HTMLIFrameElement).src = (f as HTMLIFrameElement).src;
                }}
                className="ml-0.5 h-5 w-5 rounded-full grid place-items-center text-white/70 hover:text-white"
                title="Reload"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
