import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_AUTH_FAILURE_EVENT, loadMapsSdk } from "@/lib/google-maps";
import { Layers, Share2, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";

const MAP_TYPES = ["roadmap", "satellite", "hybrid", "terrain"] as const;
type MapType = (typeof MAP_TYPES)[number];

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
  const userMarkerRef = useRef<any>(null);
  const userAccuracyRef = useRef<any>(null);
  const vendorMarkersRef = useRef<any[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mapType, setMapType] = useState<MapType>("roadmap");
  const [mapTypeOpen, setMapTypeOpen] = useState(false);

  useEffect(() => {
    const onAuthFailure = () => setStatus("error");
    window.addEventListener(GOOGLE_MAPS_AUTH_FAILURE_EVENT, onAuthFailure);
    return () => window.removeEventListener(GOOGLE_MAPS_AUTH_FAILURE_EVENT, onAuthFailure);
  }, []);

  useEffect(() => {
    if (status !== "loading") return;
    const id = window.setTimeout(() => setStatus((current) => current === "loading" ? "error" : current), 3500);
    return () => window.clearTimeout(id);
  }, [status]);

  // init map
  useEffect(() => {
    let cancel = false;
    (async () => {
      const g = await loadMapsSdk();
      if (cancel) return;
      if (!g || !ref.current) {
        setStatus("error");
        return;
      }
      const c = center ?? DEFAULT_CENTER;
      mapRef.current = new g.maps.Map(ref.current, {
        center: c,
        zoom: 15,
        mapTypeId: mapType,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        zoomControl: true,
        zoomControlOptions: { position: g.maps.ControlPosition.RIGHT_BOTTOM },
        clickableIcons: false,
      });
      setStatus("ready");
      window.setTimeout(() => {
        if (cancel || !ref.current) return;
        const hasGoogleError = !!ref.current.querySelector(".gm-err-container, .gm-err-message") ||
          ref.current.textContent?.includes("didn't load Google Maps correctly");
        if (hasGoogleError) setStatus("error");
      }, 1800);
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recenter when geo updates
  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.panTo(center);
  }, [center?.lat, center?.lng]);

  // map-type change
  useEffect(() => {
    if (mapRef.current) mapRef.current.setMapTypeId(mapType);
  }, [mapType]);

  // user marker (avatar pin at center)
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const g = (window as any).google;
    const pos = center ?? DEFAULT_CENTER;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    if (userAccuracyRef.current) userAccuracyRef.current.setMap(null);

    userAccuracyRef.current = new g.maps.Circle({
      map: mapRef.current,
      center: pos,
      radius: 80,
      fillColor: "#2563eb",
      fillOpacity: 0.12,
      strokeColor: "#2563eb",
      strokeOpacity: 0.4,
      strokeWeight: 1,
      clickable: false,
    });

    userMarkerRef.current = new g.maps.Marker({
      map: mapRef.current,
      position: pos,
      icon: {
        url: userAvatar,
        scaledSize: new g.maps.Size(46, 46),
        anchor: new g.maps.Point(23, 46),
      },
      zIndex: 999,
      title: userLabel || "You",
    });
  }, [status, center?.lat, center?.lng, userAvatar, userLabel]);

  // vendor markers around user
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const g = (window as any).google;
    const pos = center ?? DEFAULT_CENTER;
    vendorMarkersRef.current.forEach((m) => m.setMap(null));
    vendorMarkersRef.current = [];
    vendors.forEach((v) => {
      // ±~0.8km spread around user
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
      <div ref={ref} className="absolute inset-0" />
      {status === "error" && <MapFallback center={center ?? DEFAULT_CENTER} vendors={vendors} userAvatar={userAvatar} userLabel={userLabel} />}
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-slate-100">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
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
    <div className="absolute inset-0 z-20 overflow-hidden bg-[linear-gradient(135deg,#eef3f8_0%,#dfe7ef_45%,#edf2f7_100%)]">
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(90deg, rgba(148,163,184,.28) 1px, transparent 1px), linear-gradient(0deg, rgba(148,163,184,.28) 1px, transparent 1px)", backgroundSize: "46px 46px" }} />
      <div className="absolute left-[-12%] top-[46%] h-10 w-[130%] -rotate-[16deg] rounded-full bg-white/80 shadow-inner" />
      <div className="absolute left-[18%] top-[-12%] h-[120%] w-12 rotate-[28deg] rounded-full bg-white/75 shadow-inner" />
      <div className="absolute left-[-10%] top-[22%] h-8 w-[60%] rotate-[8deg] rounded-full bg-amber-100/80" />
      {vendors.map((v) => (
        <div key={v.id} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${v.x}%`, top: `${v.y}%` }} title={v.name}>
          <div className="h-9 w-9 rounded-full border-2 border-white bg-white shadow-lg overflow-hidden">
            <img src={v.avatar} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="mx-auto h-2 w-2 rotate-45 bg-white shadow" />
        </div>
      ))}
      <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-full">
        <div className="h-12 w-12 rounded-full border-[3px] border-white bg-white shadow-xl overflow-hidden ring-2 ring-blue-500">
          <img src={userAvatar} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="mx-auto h-3 w-3 rotate-45 bg-blue-500 shadow" />
      </div>
      <div className="absolute left-3 bottom-3 right-16 z-30 px-2.5 py-1.5 rounded-lg bg-white/95 border border-slate-200 shadow text-[11px] font-semibold text-slate-800 truncate">
        📍 {userLabel || "Detecting your location…"}
      </div>
    </div>
  );
}
