import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, Minus, Smartphone, GripHorizontal, ExternalLink,
  ZoomIn, ZoomOut, Maximize2, Plus, RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Device = { id: string; label: string; src: string; icon?: string };
type DbDevice = { id: string; label: string; url: string; icon: string | null };

const DEFAULT_DEVICES: Device[] = [
  { id: "app", label: "App", src: "/register?web=1&embed=1", icon: "📱" },
  { id: "quick", label: "Quick", src: "/quick?web=1&embed=1", icon: "⚡" },
  { id: "home", label: "Home", src: "/home?web=1&embed=1", icon: "🏠" },
  { id: "vendor", label: "Vendor", src: "/vendor/dashboard?web=1&embed=1", icon: "🏪" },
  { id: "admin", label: "Admin", src: "/admin?web=1&embed=1", icon: "👑" },
];

const FRAME_W = 300;
const FRAME_H = 620;
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 1.4;
const ZOOM_STEP = 0.1;

const LS_VISIBLE = "ko-devices-visible-v3";
const LS_STATE = (id: string) => `ko-device-state-v3-${id}`;

function withEmbedParams(src: string) {
  const clean = src.trim() || "/";
  if (typeof window === "undefined") return clean;
  try {
    const url = new URL(clean, window.location.origin);
    const internalHost =
      url.origin === window.location.origin ||
      url.hostname === "karoonline.in" ||
      url.hostname === "www.karoonline.in";
    if (clean.startsWith("/") || internalHost) {
      url.searchParams.set("web", "1");
      url.searchParams.set("embed", "1");
      return clean.startsWith("/") || url.origin === window.location.origin
        ? `${url.pathname}${url.search}${url.hash}`
        : url.toString();
    }
  } catch {}
  return clean;
}

function vw() { return typeof window === "undefined" ? 1024 : window.innerWidth; }
function vh() { return typeof window === "undefined" ? 768 : window.innerHeight; }
function fitScale() {
  const maxW = Math.min(vw() * 0.92, 380);
  const maxH = vh() * 0.86;
  return Math.min(maxW / FRAME_W, maxH / FRAME_H, 1.4);
}

type FrameState = { x: number; y: number; zoom: number; minimized: boolean };

function PhoneFrame({
  device, indexOffset, onClose,
}: { device: Device; indexOffset: number; onClose: () => void }) {
  const [state, setState] = useState<FrameState>(() => {
    if (typeof window === "undefined") return { x: 24, y: 80, zoom: 1, minimized: false };
    try {
      const saved = JSON.parse(localStorage.getItem(LS_STATE(device.id)) || "null");
      if (saved && typeof saved.x === "number") return saved;
    } catch {}
    const s = fitScale();
    const baseX = vw() >= 1024
      ? Math.max(8, vw() - (FRAME_W * s + 16) * (indexOffset + 1) - 24)
      : Math.max(8, (vw() - FRAME_W * s) / 2);
    const baseY = Math.max(16, (vh() - FRAME_H * s) / 2) + (vw() >= 1024 ? 0 : indexOffset * 30);
    return { x: baseX, y: baseY, zoom: 1, minimized: false };
  });
  const stateRef = useRef(state); stateRef.current = state;
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ dx: number; dy: number; active: boolean }>({ dx: 0, dy: 0, active: false });

  const scale = Math.max(0.3, Math.min(state.zoom * fitScale(), ZOOM_MAX));

  function clamp(x: number, y: number, isMin = state.minimized) {
    const W = isMin ? 64 : FRAME_W * scale;
    const H = isMin ? 64 : FRAME_H * scale;
    return {
      x: Math.min(Math.max(8, x), Math.max(8, vw() - W - 8)),
      y: Math.min(Math.max(8, y), Math.max(8, vh() - H - 8)),
    };
  }

  function persist(next: Partial<FrameState>) {
    setState((s) => {
      const merged = { ...s, ...next };
      const c = clamp(merged.x, merged.y, merged.minimized);
      const out = { ...merged, x: c.x, y: c.y };
      try { localStorage.setItem(LS_STATE(device.id), JSON.stringify(out)); } catch {}
      return out;
    });
  }

  useEffect(() => {
    const onResize = () => persist({});
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if (!ref.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const r = ref.current.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, active: true };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    const c = clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy);
    setState((s) => ({ ...s, x: c.x, y: c.y }));
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!drag.current.active) return;
    drag.current.active = false;
    persist({});
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  const isInternal = device.src.startsWith("/");
  const openHref = isInternal ? device.src.split("?")[0] : device.src;

  if (state.minimized) {
    return (
      <div
        ref={ref}
        className="fixed z-[999] h-16 w-16 rounded-2xl grid place-items-center text-[#1a1208] shadow-xl cursor-grab active:cursor-grabbing"
        style={{
          left: state.x, top: state.y,
          background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => persist({ minimized: false })}
        title={`${device.label} — drag / double-click to expand`}
      >
        {device.icon ? <span className="text-lg">{device.icon}</span> : <Smartphone className="h-6 w-6" />}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="fixed z-[999] select-none"
      style={{ left: state.x, top: state.y, width: FRAME_W * scale, height: FRAME_H * scale }}
    >
      <div style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})`, transformOrigin: "top left", position: "relative" }}>
        <div
          className="relative h-full w-full rounded-[40px] p-2.5 shadow-2xl"
          style={{
            background: "linear-gradient(160deg,#1a1a1a,#0a0a0a)",
            border: "2px solid #2a2a2a",
            boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.18)",
          }}
        >
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-3 py-1 rounded-full bg-[#1a1a1a]/95 border border-[#d4af37]/30 cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <GripHorizontal className="h-3.5 w-3.5 text-[#d4af37]" />
            <span className="text-[10px] uppercase tracking-widest text-white/70">{device.label}</span>
          </div>

          <div className="absolute -top-2 right-2 z-20 flex items-center gap-1">
            <button onClick={() => persist({ zoom: Math.max(ZOOM_MIN, state.zoom - ZOOM_STEP) })}
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:border-[#d4af37]/60" title="Zoom out">
              <ZoomOut className="h-3 w-3" />
            </button>
            <button onClick={() => persist({ zoom: Math.min(ZOOM_MAX, state.zoom + ZOOM_STEP) })}
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:border-[#d4af37]/60" title="Zoom in">
              <ZoomIn className="h-3 w-3" />
            </button>
            <button onClick={() => persist({ zoom: 1 })}
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:border-[#d4af37]/60" title="Reset zoom">
              <Maximize2 className="h-3 w-3" />
            </button>
            <button onClick={() => { const f = ref.current?.querySelector("iframe") as HTMLIFrameElement | null; if (f) f.src = f.src; }}
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:border-[#d4af37]/60" title="Reload">
              <RotateCcw className="h-3 w-3" />
            </button>
            <a href={openHref} target={isInternal ? "_self" : "_blank"} rel="noreferrer"
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:border-[#d4af37]/60" title="Open full">
              <ExternalLink className="h-3 w-3" />
            </a>
            <button onClick={() => persist({ minimized: true })}
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:border-[#d4af37]/50" title="Minimize">
              <Minus className="h-3 w-3" />
            </button>
            <button onClick={onClose}
              className="h-6 w-6 rounded-full grid place-items-center bg-[#1a1a1a] border border-white/15 text-white/80 hover:border-red-400/60" title="Close">
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="relative h-full w-full rounded-[32px] overflow-hidden bg-white">
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 h-4 w-20 rounded-full bg-black/90" />
            <iframe
              src={device.src}
              title={`${device.label} preview`}
              className="absolute inset-0 h-full w-full border-0"
              allow="geolocation; clipboard-write; camera; microphone"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FloatingPhoneMockup() {
  const [mounted, setMounted] = useState(false);
  const [devices, setDevices] = useState<Device[]>(DEFAULT_DEVICES);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: unknown) => {
              order: (c: string) => Promise<{ data: DbDevice[] | null; error: Error | null }>;
            };
          };
        };
      })
        .from("web_virtual_devices")
        .select("id,label,url,icon")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      const next = (data ?? []).map((d) => ({
        id: `db-${d.id}`,
        label: d.label,
        src: withEmbedParams(d.url),
        icon: d.icon ?? undefined,
      }));
      setDevices(next);
      setVisible((current) => {
        const allowed = new Set(next.map((d) => d.id));
        const cleaned = Object.fromEntries(
          Object.entries(current).filter(([id]) => allowed.has(id)),
        ) as Record<string, boolean>;
        if (!Object.values(cleaned).some(Boolean) && next[0]) cleaned[next[0].id] = true;
        try { localStorage.setItem(LS_VISIBLE, JSON.stringify(cleaned)); } catch {}
        return cleaned;
      });
    } catch {
      setDevices(DEFAULT_DEVICES);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      const v = JSON.parse(localStorage.getItem(LS_VISIBLE) || "null");
      if (v && typeof v === "object") setVisible(v);
      else setVisible({ app: true });
    } catch { setVisible({ app: true }); }

    loadDevices();
    const channel = supabase
      .channel("ko-web-virtual-devices")
      .on("postgres_changes", { event: "*", schema: "public", table: "web_virtual_devices" }, loadDevices)
      .subscribe();

    const onOpen = () => {
      setVisible((v) => {
        const next = { ...v, app: true };
        try { localStorage.setItem(LS_VISIBLE, JSON.stringify(next)); } catch {}
        return next;
      });
    };
    window.addEventListener("ko-open-phone", onOpen);
    return () => {
      window.removeEventListener("ko-open-phone", onOpen);
      supabase.removeChannel(channel);
    };
  }, [loadDevices]);

  const allDevices = useMemo(() => devices, [devices]);

  function toggle(id: string) {
    setVisible((v) => {
      const next = { ...v, [id]: !v[id] };
      try { localStorage.setItem(LS_VISIBLE, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  if (!mounted) return null;

  const activeDevices = allDevices.filter((d) => visible[d.id]);

  return (
    <>
      {activeDevices.map((d, i) => (
        <PhoneFrame key={d.id} device={d} indexOffset={i} onClose={() => toggle(d.id)} />
      ))}

      {/* Launcher FAB */}
      <div className="fixed bottom-4 right-4 z-[1000] flex flex-col items-end gap-2">
        {menuOpen && (
          <div className="w-64 max-h-[60vh] overflow-y-auto rounded-2xl border border-[#d4af37]/30 bg-[#0a0a0a]/95 backdrop-blur p-2 shadow-2xl">
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-[#d4af37]/80">Virtual Devices</div>
            {allDevices.map((d) => {
              const on = !!visible[d.id];
              return (
                <button
                  key={d.id}
                  onClick={() => toggle(d.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-left"
                >
                  <span className="h-7 w-7 rounded-lg grid place-items-center bg-white/5 text-sm">
                    {d.icon || "📱"}
                  </span>
                  <span className="flex-1 text-sm text-white/90 truncate">{d.label}</span>
                  <span className={`h-5 w-9 rounded-full relative transition ${on ? "bg-[#d4af37]" : "bg-white/15"}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                </button>
              );
            })}
            {allDevices.length === 0 && (
              <div className="px-3 py-2 text-[10px] text-white/40">
                No enabled devices. Enable one from Admin → Special Web → Virtual Devices.
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => {
            loadDevices();
            setMenuOpen((o) => !o);
          }}
          className="h-12 w-12 rounded-full grid place-items-center text-[#1a1208] shadow-2xl hover:scale-105 transition"
          style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}
          title="Add / hide virtual devices"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>
    </>
  );
}
