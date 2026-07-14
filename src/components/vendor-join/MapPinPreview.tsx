import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { geocodeFn, reverseGeocodeFn } from "@/lib/maps.functions";
import { toast } from "sonner";

const BROWSER_KEY =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.[
      "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"
    ]) ||
  "";

const TRACKING_ID =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.[
      "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"
    ]) ||
  "";

declare global {
  interface Window {
    google?: {
      maps?: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => unknown;
        Marker: new (opts: Record<string, unknown>) => {
          getPosition(): { lat(): number; lng(): number };
          addListener(ev: string, cb: () => void): void;
        };
      };
    };
    __koInitMap?: () => void;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadMapsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.Map) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  if (!BROWSER_KEY) return Promise.reject(new Error("Maps browser key missing"));

  scriptPromise = new Promise((resolve, reject) => {
    window.__koInitMap = () => resolve();
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: "async",
      callback: "__koInitMap",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    s.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export type MapPinResult = {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

/**
 * Compact draggable map pin used inside the scanner review + business info sheet.
 * Geocodes the provided address, drops a pin, and reports back on drag.
 */
export function MapPinPreview({
  address,
  onConfirm,
}: {
  address: string | null | undefined;
  onConfirm: (r: MapPinResult) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pin, setPin] = useState<MapPinResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const runGeocode = useServerFn(geocodeFn);
  const runReverse = useServerFn(reverseGeocodeFn);

  useEffect(() => {
    if (!address || !address.trim()) return;
    let cancelled = false;

    (async () => {
      setStatus("loading");
      setErrorMsg("");
      try {
        const g = await runGeocode({ data: { address } });
        if (cancelled) return;
        if (!g.ok) {
          setStatus("error");
          setErrorMsg("Location detect nahi hui — manually pin drag karein");
          return;
        }
        await loadMapsScript();
        if (cancelled) return;
        const el = containerRef.current;
        if (!el || !window.google?.maps) {
          setStatus("error");
          setErrorMsg("Map load failed");
          return;
        }
        const center = { lat: g.lat, lng: g.lng };
        const map = new window.google.maps.Map(el, {
          center,
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        const marker = new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
        });
        const initial: MapPinResult = { lat: g.lat, lng: g.lng, address };
        setPin(initial);
        setStatus("ready");

        marker.addListener("dragend", async () => {
          const p = marker.getPosition();
          const lat = p.lat();
          const lng = p.lng();
          const r = await runReverse({ data: { lat, lng } });
          if (r.ok && r.results?.[0]) {
            const res = r.results[0] as {
              formatted_address: string;
              address_components: { long_name: string; types: string[] }[];
            };
            const findComp = (t: string) =>
              res.address_components?.find((c) => c.types?.includes(t))?.long_name;
            setPin({
              lat,
              lng,
              address: res.formatted_address,
              city: findComp("locality") ?? findComp("administrative_area_level_2"),
              state: findComp("administrative_area_level_1"),
              pincode: findComp("postal_code"),
            });
          } else {
            setPin({ lat, lng });
          }
        });
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg((e as Error).message || "Map error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  if (!address) return null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-neutral-100">
        <MapPin className="h-4 w-4 text-amber-600" />
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-700">
          Location pin
        </div>
        {status === "loading" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400 ml-auto" />
        )}
      </div>
      <div ref={containerRef} className="h-40 w-full bg-neutral-100">
        {status === "error" && (
          <div className="h-full grid place-items-center text-[11px] text-neutral-500 text-center px-4">
            {errorMsg || "Map load nahi hua"}
          </div>
        )}
      </div>
      {pin && status === "ready" && (
        <div className="p-2.5 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-neutral-500">Selected</div>
            <div className="text-[11px] text-neutral-800 truncate">
              {pin.address ?? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onConfirm(pin);
              toast.success("Pin saved");
            }}
            className="h-8 px-3 rounded-full bg-amber-500 text-white text-[11px] font-extrabold flex items-center gap-1"
          >
            <Check className="h-3 w-3" /> Confirm
          </button>
        </div>
      )}
      <div className="px-2.5 pb-2 text-[10px] text-neutral-500">
        Pin ko drag karke exact shop location set karein
      </div>
    </div>
  );
}
