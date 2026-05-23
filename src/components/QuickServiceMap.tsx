import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_AUTH_FAILURE_EVENT, loadMapsSdk } from "@/lib/google-maps";
import { Layers, Share2, Loader2, LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";

const MAP_TYPES = ["roadmap", "satellite", "hybrid", "terrain"] as const;
type MapType = (typeof MAP_TYPES)[number];
const isPreviewBlockedMapsHost = () =>
  typeof window !== "undefined" && window.location.hostname.endsWith(".lovableproject.com");

export type QuickMapVendor = {
  id: string;
  name: string;
  avatar: string;
  /** percent 0-100 inside the old fake-map; converted to ~±1km offset on real map */
  x: number;
  y: number;
  area?: string;
  km?: number;
  status?: "Office" | "Online";
  onClick?: () => void;
};

const DEFAULT_CENTER = { lat: 28.6562, lng: 77.241 }; // Delhi Sadar Bazar fallback

// Clean, Uber/Ola-like light map style with subtle brand-gold roads
const KARO_MAP_STYLE: any[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f1e8" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b6256" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fdfaf2" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d9d0bd" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dfead0" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#7c8b5e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e9e0c8" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fff5d6" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e6c97a" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9a8f78" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bcdce6" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#5a8794" }] },
];

function buildUserPinHTML(avatar: string, label: string) {
  const safeAvatar = avatar.replace(/"/g, "&quot;");
  const safeLabel = (label || "Detecting your location…")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
    <div class="ko-userpin">
      <span class="ko-ripple ko-ripple-1"></span>
      <span class="ko-ripple ko-ripple-2"></span>
      <span class="ko-ripple ko-ripple-3"></span>
      <div class="ko-teardrop">
        <div class="ko-teardrop-head">
          <img src="${safeAvatar}" alt="" />
        </div>
        <div class="ko-teardrop-tail"></div>
      </div>
      <div class="ko-addr-chip">
        <span class="ko-addr-pin">📍</span>
        <span class="ko-addr-text">${safeLabel}</span>
      </div>
    </div>`;
}

function buildVendorCardHTML(v: QuickMapVendor) {
  const safeAvatar = v.avatar.replace(/"/g, "&quot;");
  const safeName = v.name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const safeArea = (v.area || "Nearby").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const km = typeof v.km === "number" ? `${v.km.toFixed(1)} km.` : "";
  const status = v.status || "Office";
  return `
    <div class="ko-vcard" data-vid="${v.id}">
      <div class="ko-vcard-avatar"><img src="${safeAvatar}" alt="" /></div>
      <div class="ko-vcard-body">
        <div class="ko-vcard-name">${safeName}</div>
        <div class="ko-vcard-area"><span>📍</span>${safeArea}</div>
        <div class="ko-vcard-meta">${km} <u>${status}</u></div>
      </div>
    </div>`;
}

export function QuickServiceMap({
  center,
  vendors,
  userAvatar,
  userLabel,
  geoStatus,
}: {
  center: { lat: number; lng: number } | null;
  vendors: QuickMapVendor[];
  userAvatar: string;
  userLabel?: string;
  geoStatus?: "idle" | "loading" | "ready" | "denied" | "unsupported" | "error";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const userOverlayRef = useRef<any>(null);
  const vendorOverlaysRef = useRef<any[]>([]);
  const didInitialCenterRef = useRef(false);
  // Always start in "loading" for SSR-safe hydration; switch to "error" in effect when running on a preview host.
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    if (isPreviewBlockedMapsHost()) setStatus("error");
  }, []);
  const [mapType, setMapType] = useState<MapType>("roadmap");
  const [mapTypeOpen, setMapTypeOpen] = useState(false);

  useEffect(() => {
    const onAuthFailure = () => setStatus("error");
    window.addEventListener(GOOGLE_MAPS_AUTH_FAILURE_EVENT, onAuthFailure);
    return () => window.removeEventListener(GOOGLE_MAPS_AUTH_FAILURE_EVENT, onAuthFailure);
  }, []);

  useEffect(() => {
    if (status !== "loading") return;
    const id = window.setTimeout(() => setStatus((current) => current === "loading" ? "error" : current), 5000);
    return () => window.clearTimeout(id);
  }, [status]);

  // init map
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (isPreviewBlockedMapsHost()) {
        setStatus("error");
        return;
      }
      const g = await loadMapsSdk(["places"]);
      if (cancel) return;
      if (!g || !ref.current) {
        setStatus("error");
        return;
      }
      const c = center ?? DEFAULT_CENTER;
      const controlPosition = g.maps.ControlPosition?.RIGHT_BOTTOM ?? 12;
      mapRef.current = new g.maps.Map(ref.current, {
        center: c,
        zoom: 16,
        mapTypeId: mapType,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        zoomControl: true,
        zoomControlOptions: { position: controlPosition },
        clickableIcons: false,
        styles: KARO_MAP_STYLE,
        backgroundColor: "#f5f1e8",
      });
      setStatus("ready");
      window.setTimeout(() => {
        if (cancel || !ref.current) return;
        const hasTiles = !!ref.current.querySelector('img[src*="google"], img[src*="ggpht"], canvas');
        const hasGoogleError = !!ref.current.querySelector(".gm-err-container, .gm-err-message") ||
          ref.current.textContent?.includes("didn't load Google Maps correctly");
        if (hasGoogleError || !hasTiles) setStatus("error");
      }, 4500);
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recenter when geo updates — animated zoom-in on first fix (Uber/Ola feel)
  useEffect(() => {
    if (!mapRef.current || !center) return;
    if (!didInitialCenterRef.current) {
      didInitialCenterRef.current = true;
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(13); // start wide
      // smooth zoom-in steps for cinematic effect
      const steps = [14, 15, 16, 17];
      steps.forEach((z, i) => {
        window.setTimeout(() => {
          if (!mapRef.current) return;
          mapRef.current.panTo(center);
          mapRef.current.setZoom(z);
        }, 250 + i * 220);
      });
    } else {
      mapRef.current.panTo(center);
    }
  }, [center?.lat, center?.lng]);

  // map-type change — keep custom styles only on roadmap
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(mapType);
    mapRef.current.setOptions({ styles: mapType === "roadmap" ? KARO_MAP_STYLE : [] });
  }, [mapType]);

  // user overlay (custom HTML pin with avatar teardrop + ripple + address chip)
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const g = (window as any).google;
    const pos = center ?? DEFAULT_CENTER;

    if (userOverlayRef.current) {
      userOverlayRef.current.setMap(null);
      userOverlayRef.current = null;
    }

    class AvatarPinOverlay extends g.maps.OverlayView {
      position: any;
      div: HTMLDivElement | null = null;
      avatar: string;
      label: string;
      constructor(position: any, avatar: string, label: string) {
        super();
        this.position = position;
        this.avatar = avatar;
        this.label = label;
      }
      onAdd() {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.transform = "translate(-50%, -100%)";
        div.style.pointerEvents = "none";
        div.innerHTML = buildUserPinHTML(this.avatar, this.label);
        this.div = div;
        const panes = this.getPanes();
        panes?.floatPane.appendChild(div);
      }
      draw() {
        if (!this.div) return;
        const projection = this.getProjection();
        if (!projection) return;
        const point = projection.fromLatLngToDivPixel(
          new g.maps.LatLng(this.position.lat, this.position.lng),
        );
        if (point) {
          this.div.style.left = `${point.x}px`;
          // Anchor the teardrop tip on the actual lat/lng (translateY: -100%)
          this.div.style.top = `${point.y}px`;
        }
      }
      onRemove() {
        if (this.div?.parentNode) this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
      updatePosition(p: { lat: number; lng: number }) {
        this.position = p;
        this.draw();
      }
      updateLabel(label: string) {
        this.label = label;
        if (this.div) {
          const el = this.div.querySelector(".ko-addr-text");
          if (el) el.textContent = label;
        }
      }
    }

    const overlay = new AvatarPinOverlay(pos, userAvatar, userLabel || "Detecting your location…");
    overlay.setMap(mapRef.current);
    userOverlayRef.current = overlay;
  }, [status, userAvatar]);

  // move overlay when center changes (avoid re-creating)
  useEffect(() => {
    if (!userOverlayRef.current || !center) return;
    userOverlayRef.current.updatePosition(center);
  }, [center?.lat, center?.lng]);

  // update label without re-creating
  useEffect(() => {
    if (!userOverlayRef.current) return;
    userOverlayRef.current.updateLabel(userLabel || "Detecting your location…");
  }, [userLabel]);

  // vendor info-cards around user (custom HTML overlays)
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const g = (window as any).google;
    const pos = center ?? DEFAULT_CENTER;
    vendorOverlaysRef.current.forEach((m) => m.setMap(null));
    vendorOverlaysRef.current = [];

    class VendorCardOverlay extends g.maps.OverlayView {
      position: any;
      v: QuickMapVendor;
      div: HTMLDivElement | null = null;
      constructor(position: any, v: QuickMapVendor) {
        super();
        this.position = position;
        this.v = v;
      }
      onAdd() {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.transform = "translate(-50%, -100%)";
        div.style.pointerEvents = "auto";
        div.style.cursor = this.v.onClick ? "pointer" : "default";
        div.innerHTML = buildVendorCardHTML(this.v);
        if (this.v.onClick) div.addEventListener("click", this.v.onClick);
        this.div = div;
        this.getPanes()?.overlayMouseTarget.appendChild(div);
      }
      draw() {
        if (!this.div) return;
        const projection = this.getProjection();
        if (!projection) return;
        const point = projection.fromLatLngToDivPixel(
          new g.maps.LatLng(this.position.lat, this.position.lng),
        );
        if (point) {
          this.div.style.left = `${point.x}px`;
          this.div.style.top = `${point.y}px`;
        }
      }
      onRemove() {
        if (this.div?.parentNode) this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    }

    vendors.forEach((v) => {
      const dLat = ((50 - v.y) / 50) * 0.006;
      const dLng = ((v.x - 50) / 50) * 0.006;
      const overlay = new VendorCardOverlay(
        { lat: pos.lat + dLat, lng: pos.lng + dLng },
        v,
      );
      overlay.setMap(mapRef.current);
      vendorOverlaysRef.current.push(overlay);
    });
  }, [vendors, status, center?.lat, center?.lng]);

  const recenter = () => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("ko-geo-refresh"));
    if (!mapRef.current) return;
    const pos = center ?? DEFAULT_CENTER;
    mapRef.current.panTo(pos);
    mapRef.current.setZoom(16);
  };

  const requestLocation = () => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      toast.error("Location not supported on this device");
      return;
    }
    toast.loading("Detecting your precise location…", { id: "ko-geo" });
    // Trigger fresh, high-accuracy fix → this also re-prompts the OS/browser
    // permission sheet if it was previously dismissed.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.success("Location enabled", { id: "ko-geo" });
        // notify the geolocation hook to seed + start watching
        window.dispatchEvent(new Event("ko-geo-refresh"));
        if (mapRef.current) {
          mapRef.current.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          mapRef.current.setZoom(17);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error(
            "Location is blocked. Open browser settings → Site permissions → Location → Allow, then reload.",
            { id: "ko-geo", duration: 6000 },
          );
        } else {
          toast.error("Couldn't get GPS fix. Move to an open area and try again.", { id: "ko-geo" });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleShare = async () => {
    const pos = center ?? DEFAULT_CENTER;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${pos.lat},${pos.lng}`;
    const text = `📍 ${userLabel ? userLabel + "\n" : "My current location\n"}${mapUrl}`;
    // 1) Always try WhatsApp first (mobile + desktop)
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    try {
      const win = window.open(waUrl, "_blank", "noopener");
      if (win) {
        toast.success("Opening WhatsApp…");
        return;
      }
    } catch { /* fallthrough */ }
    // 2) Native share sheet
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: "My location", text, url: mapUrl });
        return;
      }
    } catch { /* user cancel */ }
    // 3) Clipboard fallback
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Location copied — paste in WhatsApp");
    } catch {
      window.open(mapUrl, "_blank");
    }
  };

  const denied = geoStatus === "denied" || geoStatus === "error" || geoStatus === "unsupported";

  return (
    <div className="absolute inset-0">
      <style>{`
        /* --- USER TEARDROP PIN --- */
        .ko-userpin { position: relative; width: 64px; height: 88px; pointer-events: none; }
        .ko-teardrop {
          position: relative; z-index: 3;
          width: 56px; height: 70px; margin: 0 auto;
          filter: drop-shadow(0 6px 10px rgba(60,40,10,.35));
        }
        .ko-teardrop-head {
          position: absolute; left: 50%; top: 0; transform: translateX(-50%);
          width: 56px; height: 56px; border-radius: 9999px;
          background: linear-gradient(135deg, #b46a2a 0%, #7c4516 100%);
          padding: 4px;
          display: grid; place-items: center;
          animation: ko-heartbeat 1.6s ease-in-out infinite;
          transform-origin: 50% 100%;
        }
        @keyframes ko-heartbeat {
          0%, 100% { transform: translateX(-50%) scale(1); }
          15%      { transform: translateX(-50%) scale(1.08); }
          30%      { transform: translateX(-50%) scale(0.97); }
          45%      { transform: translateX(-50%) scale(1.05); }
          60%      { transform: translateX(-50%) scale(1); }
        }
        .ko-teardrop-head img {
          width: 100%; height: 100%; border-radius: 9999px; object-fit: cover;
          background: #fff; border: 2px solid #fff;
        }
        .ko-teardrop-tail {
          position: absolute; left: 50%; bottom: 0; transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 11px solid transparent;
          border-right: 11px solid transparent;
          border-top: 18px solid #7c4516;
        }
        /* address chip directly under pin */
        .ko-addr-chip {
          position: absolute; left: 50%; bottom: -18px; transform: translateX(-50%);
          z-index: 4;
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 9px; border-radius: 9999px;
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 4px 12px rgba(0,0,0,.18);
          font-size: 10.5px; font-weight: 700; color: #1f2937;
          max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ko-addr-pin { font-size: 10px; }
        /* ripples behind teardrop head */
        .ko-ripple {
          position: absolute; left: 50%; top: 28px;
          width: 56px; height: 56px; margin: -28px 0 0 -28px;
          border-radius: 9999px;
          background: rgba(37, 99, 235, 0.22);
          box-shadow: 0 0 0 2px rgba(37,99,235,.35);
          transform: scale(0.6); opacity: 0.8;
          animation: ko-ripple 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          z-index: 1;
        }
        .ko-ripple-2 { animation-delay: .8s; }
        .ko-ripple-3 { animation-delay: 1.6s; }
        @keyframes ko-ripple {
          0%   { transform: scale(0.55); opacity: 0.75; }
          70%  { opacity: 0.12; }
          100% { transform: scale(2.6); opacity: 0; }
        }

        /* --- VENDOR INFO CARDS --- */
        .ko-vcard {
          display: flex; align-items: center; gap: 7px;
          background: #fff; border-radius: 14px;
          padding: 5px 10px 5px 5px;
          box-shadow: 0 6px 16px rgba(0,0,0,.16), 0 0 0 1px rgba(0,0,0,.04);
          min-width: 142px; max-width: 170px;
          font-family: inherit;
          animation: ko-vcard-in .3s ease-out both;
        }
        @keyframes ko-vcard-in {
          from { opacity: 0; transform: translate(-50%, -100%) translateY(6px); }
          to   { opacity: 1; transform: translate(-50%, -100%) translateY(0); }
        }
        .ko-vcard-avatar {
          width: 32px; height: 32px; border-radius: 9999px; overflow: hidden;
          background: #f3f4f6; flex-shrink: 0; border: 1.5px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,.15);
        }
        .ko-vcard-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .ko-vcard-body { flex: 1; min-width: 0; line-height: 1.15; }
        .ko-vcard-name { font-size: 11.5px; font-weight: 700; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ko-vcard-area { font-size: 9.5px; color: #4b5563; display: flex; align-items: center; gap: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ko-vcard-area span { font-size: 8px; }
        .ko-vcard-meta { font-size: 9.5px; color: #4b5563; margin-top: 1px; }
        .ko-vcard-meta u { color: #b45309; font-weight: 600; }
      `}</style>
      <div ref={ref} className="absolute inset-0" />
      {status === "error" && <MapFallback center={center ?? DEFAULT_CENTER} vendors={vendors} userAvatar={userAvatar} userLabel={userLabel} />}
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-[#f5f1e8]">
          <Loader2 className="h-5 w-5 animate-spin text-amber-700" />
        </div>
      )}

      {/* Right-side floating controls — light & translucent so map stays clean */}
      <div className="absolute top-3 right-2 z-30 flex flex-col gap-1.5 items-end">
        <button
          onClick={() => setMapTypeOpen((o) => !o)}
          className="h-8 w-8 rounded-full bg-white/55 backdrop-blur-sm shadow-sm grid place-items-center border border-white/70 active:scale-95 transition opacity-70 hover:opacity-100"
          aria-label="Change map style"
        >
          <Layers className="h-4 w-4 text-slate-700/80" />
        </button>
        {mapTypeOpen && (
          <div className="rounded-xl bg-white shadow-xl border border-slate-200 p-1.5 flex flex-col gap-1 min-w-[112px]">
            {MAP_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setMapType(t);
                  setMapTypeOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize text-left ${
                  mapType === t
                    ? "bg-amber-100 text-amber-900"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={handleShare}
          className="h-8 w-8 rounded-full bg-white/55 backdrop-blur-sm shadow-sm grid place-items-center border border-white/70 active:scale-95 transition opacity-70 hover:opacity-100"
          aria-label="Share my location"
        >
          <Share2 className="h-4 w-4 text-slate-700/80" />
        </button>
        <button
          onClick={recenter}
          className="h-8 w-8 rounded-full bg-white/55 backdrop-blur-sm shadow-sm grid place-items-center border border-white/70 active:scale-95 transition opacity-80 hover:opacity-100"
          aria-label="Recenter on me"
        >
          <LocateFixed className="h-4 w-4 text-blue-600/90" />
        </button>
      </div>

      {/* Vendor count chip */}
      <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-full bg-white/90 border border-amber-300/60 shadow text-[10px] font-bold text-amber-900">
        {vendors.length} nearby vendors
      </div>

      {/* Tap-to-enable — tiny corner chip so it doesn't cover the search area */}
      {denied && (
        <button
          onClick={requestLocation}
          aria-label="Enable precise location"
          className="absolute top-3 right-12 z-30 h-7 w-7 rounded-full bg-white/90 border border-amber-300 shadow grid place-items-center active:scale-95"
        >
          <MapPin className="h-3.5 w-3.5 text-red-500" />
        </button>
      )}
    </div>
  );
}

function MapFallback({
  vendors,
  userAvatar,
  userLabel,
}: {
  center: { lat: number; lng: number };
  vendors: QuickMapVendor[];
  userAvatar: string;
  userLabel?: string;
}) {
  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-[linear-gradient(135deg,#faf5e8_0%,#efe6d2_45%,#f5efdc_100%)]">
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(90deg, rgba(180,160,110,.28) 1px, transparent 1px), linear-gradient(0deg, rgba(180,160,110,.28) 1px, transparent 1px)", backgroundSize: "46px 46px" }} />
      <div className="absolute left-[-12%] top-[46%] h-10 w-[130%] -rotate-[16deg] rounded-full bg-white/85 shadow-inner" />
      <div className="absolute left-[18%] top-[-12%] h-[120%] w-12 rotate-[28deg] rounded-full bg-white/80 shadow-inner" />
      <div className="absolute left-[-10%] top-[22%] h-8 w-[60%] rotate-[8deg] rounded-full bg-amber-100/80" />
      {vendors.map((v) => (
        <div
          key={v.id}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${v.x}%`, top: `${v.y}%` }}
          dangerouslySetInnerHTML={{ __html: buildVendorCardHTML(v) }}
        />
      ))}
      <div
        className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-full"
        dangerouslySetInnerHTML={{ __html: buildUserPinHTML(userAvatar, userLabel || "Detecting your location…") }}
      />
    </div>
  );
}
