import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_AUTH_FAILURE_EVENT, loadMapsSdk } from "@/lib/google-maps";
import { Layers, Share2, Loader2, LocateFixed } from "lucide-react";
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

export function QuickServiceMap({
  center,
  vendors,
  userAvatar,
  userLabel,
}: {
  center: { lat: number; lng: number } | null;
  vendors: QuickMapVendor[];
  userAvatar: string;
  userLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const userOverlayRef = useRef<any>(null);
  const vendorMarkersRef = useRef<any[]>([]);
  const didInitialCenterRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(() => isPreviewBlockedMapsHost() ? "error" : "loading");
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
      mapRef.current = new g.maps.Map(ref.current, {
        center: c,
        zoom: 16,
        mapTypeId: mapType,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        zoomControl: true,
        zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_BOTTOM },
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

  // recenter when geo updates — auto-center the first time we get a fix
  useEffect(() => {
    if (!mapRef.current || !center) return;
    if (!didInitialCenterRef.current) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(16);
      didInitialCenterRef.current = true;
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

  // user overlay (custom HTML pin with avatar + ripple)
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
      constructor(position: any) {
        super();
        this.position = position;
      }
      onAdd() {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.transform = "translate(-50%, -50%)";
        div.style.pointerEvents = "none";
        div.innerHTML = `
          <div class="ko-userpin">
            <span class="ko-ripple ko-ripple-1"></span>
            <span class="ko-ripple ko-ripple-2"></span>
            <span class="ko-ripple ko-ripple-3"></span>
            <span class="ko-userpin-ring">
              <img src="${userAvatar.replace(/"/g, "&quot;")}" alt="" />
            </span>
          </div>`;
        this.div = div;
        const panes = this.getPanes();
        panes?.overlayMouseTarget.appendChild(div);
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
      updatePosition(p: { lat: number; lng: number }) {
        this.position = p;
        this.draw();
      }
    }

    const overlay = new AvatarPinOverlay(pos);
    overlay.setMap(mapRef.current);
    userOverlayRef.current = overlay;
  }, [status, userAvatar]);

  // move overlay when center changes (avoid re-creating)
  useEffect(() => {
    if (!userOverlayRef.current || !center) return;
    userOverlayRef.current.updatePosition(center);
  }, [center?.lat, center?.lng]);

  // vendor markers around user
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const g = (window as any).google;
    const pos = center ?? DEFAULT_CENTER;
    vendorMarkersRef.current.forEach((m) => m.setMap(null));
    vendorMarkersRef.current = [];
    vendors.forEach((v) => {
      const dLat = ((50 - v.y) / 50) * 0.008;
      const dLng = ((v.x - 50) / 50) * 0.008;
      const m = new g.maps.Marker({
        map: mapRef.current,
        position: { lat: pos.lat + dLat, lng: pos.lng + dLng },
        icon: {
          url: v.avatar,
          scaledSize: new g.maps.Size(38, 38),
          anchor: new g.maps.Point(19, 38),
        },
        title: v.name,
      });
      if (v.onClick) m.addListener("click", v.onClick);
      vendorMarkersRef.current.push(m);
    });
  }, [vendors, status, center?.lat, center?.lng]);

  const recenter = () => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("ko-geo-refresh"));
    if (!mapRef.current) return;
    const pos = center ?? DEFAULT_CENTER;
    mapRef.current.panTo(pos);
    mapRef.current.setZoom(16);
  };

  const handleShare = async () => {
    const pos = center ?? DEFAULT_CENTER;
    const url = `https://www.google.com/maps/search/?api=1&query=${pos.lat},${pos.lng}`;
    const shareData = {
      title: "My location",
      text: userLabel ? `📍 ${userLabel}` : "📍 My current location",
      url,
    };
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share(shareData);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Location link copied");
      } else {
        window.open(url, "_blank");
      }
    } catch {
      /* user cancel */
    }
  };

  return (
    <div className="absolute inset-0">
      <style>{`
        .ko-userpin { position: relative; width: 56px; height: 56px; display: grid; place-items: center; }
        .ko-userpin-ring {
          position: relative; z-index: 2;
          width: 46px; height: 46px; border-radius: 9999px;
          background: linear-gradient(135deg, #f7d488, #d4a72c);
          padding: 3px; display: block;
          box-shadow: 0 6px 18px rgba(0,0,0,.28), 0 0 0 3px rgba(255,255,255,.95) inset;
        }
        .ko-userpin-ring img {
          width: 100%; height: 100%; border-radius: 9999px; object-fit: cover; display: block;
          background: #fff;
        }
        .ko-ripple {
          position: absolute; left: 50%; top: 50%;
          width: 46px; height: 46px; margin: -23px 0 0 -23px;
          border-radius: 9999px;
          background: rgba(37, 99, 235, 0.32);
          box-shadow: 0 0 0 2px rgba(37,99,235,.45);
          transform: scale(0.6); opacity: 0.9;
          animation: ko-ripple 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          z-index: 1;
        }
        .ko-ripple-2 { animation-delay: .8s; }
        .ko-ripple-3 { animation-delay: 1.6s; }
        @keyframes ko-ripple {
          0%   { transform: scale(0.55); opacity: 0.8; }
          70%  { opacity: 0.15; }
          100% { transform: scale(2.6); opacity: 0; }
        }
      `}</style>
      <div ref={ref} className="absolute inset-0" />
      {status === "error" && <MapFallback center={center ?? DEFAULT_CENTER} vendors={vendors} userAvatar={userAvatar} userLabel={userLabel} />}
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-[#f5f1e8]">
          <Loader2 className="h-5 w-5 animate-spin text-amber-700" />
        </div>
      )}

      {/* Right-side floating controls */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-2 items-end">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setMapTypeOpen((o) => !o)}
            className="h-10 w-10 rounded-full bg-white/95 shadow-lg grid place-items-center border border-slate-200 active:scale-95 transition"
            aria-label="Change map style"
          >
            <Layers className="h-5 w-5 text-slate-700" />
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
            className="h-10 w-10 rounded-full bg-white/95 shadow-lg grid place-items-center border border-slate-200 active:scale-95 transition"
            aria-label="Share my location"
          >
            <Share2 className="h-5 w-5 text-slate-700" />
          </button>
          <button
            onClick={recenter}
            className="h-10 w-10 rounded-full bg-white/95 shadow-lg grid place-items-center border border-slate-200 active:scale-95 transition"
            aria-label="Recenter on me"
          >
            <LocateFixed className="h-5 w-5 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Vendor count chip */}
      <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-full bg-white/95 border border-amber-300/60 shadow text-[10px] font-bold text-amber-900">
        {vendors.length} nearby vendors
      </div>

      {/* Location label chip */}
      {userLabel && (
        <div className="absolute bottom-3 left-3 right-16 z-30">
          <div className="px-2.5 py-1.5 rounded-lg bg-white/95 border border-slate-200 shadow text-[11px] font-semibold text-slate-800 truncate">
            📍 {userLabel}
          </div>
        </div>
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
        <div key={v.id} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${v.x}%`, top: `${v.y}%` }} title={v.name}>
          <div className="h-9 w-9 rounded-full border-2 border-white bg-white shadow-lg overflow-hidden">
            <img src={v.avatar} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="mx-auto h-2 w-2 rotate-45 bg-white shadow" />
        </div>
      ))}
      <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
        <div className="ko-userpin">
          <span className="ko-ripple ko-ripple-1" />
          <span className="ko-ripple ko-ripple-2" />
          <span className="ko-ripple ko-ripple-3" />
          <span className="ko-userpin-ring">
            <img src={userAvatar} alt="" />
          </span>
        </div>
      </div>
      <div className="absolute left-3 bottom-3 right-16 z-30 px-2.5 py-1.5 rounded-lg bg-white/95 border border-slate-200 shadow text-[11px] font-semibold text-slate-800 truncate">
        📍 {userLabel || "Detecting your location…"}
      </div>
    </div>
  );
}
