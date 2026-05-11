import { useEffect, useRef, useState } from "react";
import { loadMapsSdk, type LatLng } from "@/lib/google-maps";
import { Loader2 } from "lucide-react";

export type MapMarker = LatLng & {
  id: string;
  label?: string;
  color?: string; // hex without #, e.g. "10b981"
  onClick?: () => void;
};

/**
 * Interactive Google Map with vendor pins.
 * Falls back to a friendly message if the SDK / key fails to load.
 */
export function MapView({
  center,
  zoom = 13,
  markers = [],
  className = "",
  height = 280,
  showUserDot = true,
}: {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  height?: number | string;
  showUserDot?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

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
      mapRef.current = new g.maps.Map(ref.current, {
        center,
        zoom,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        styles: [
          { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
          { featureType: "poi", stylers: [{ visibility: "simplified" }] },
        ],
      });
      setStatus("ready");
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update center/zoom
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.panTo(center);
    mapRef.current.setZoom(zoom);
  }, [center.lat, center.lng, zoom]);

  // sync markers
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const g = (window as any).google;
    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = [];

    if (showUserDot) {
      const me = new g.maps.Marker({
        map: mapRef.current,
        position: center,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
        zIndex: 999,
      });
      markerRefs.current.push(me);
    }

    markers.forEach((m) => {
      const pin = new g.maps.Marker({
        map: mapRef.current,
        position: { lat: m.lat, lng: m.lng },
        label: m.label
          ? { text: m.label, color: "#fff", fontSize: "11px", fontWeight: "700" }
          : undefined,
        icon: {
          path: "M12 2C7 2 3 6 3 11c0 7 9 13 9 13s9-6 9-13c0-5-4-9-9-9z",
          fillColor: `#${m.color ?? "10b981"}`,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
          scale: 1.6,
          anchor: new g.maps.Point(12, 24),
          labelOrigin: new g.maps.Point(12, 10),
        },
      });
      if (m.onClick) pin.addListener("click", m.onClick);
      markerRefs.current.push(pin);
    });
  }, [markers, status, center.lat, center.lng, showUserDot]);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`} style={{ height }}>
      <div ref={ref} className="absolute inset-0" />
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-slate-100">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-slate-100 text-xs text-slate-500 px-4 text-center">
          Map unavailable. Showing list view.
        </div>
      )}
    </div>
  );
}
