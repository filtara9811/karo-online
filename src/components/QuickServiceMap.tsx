import { useEffect, useRef, useState } from "react";
import { loadMapsSdk } from "@/lib/google-maps";
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
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-slate-100">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-slate-100 text-xs text-slate-500 px-4 text-center">
          Map unavailable. Add a Google Maps API key in Admin → Maps.
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
