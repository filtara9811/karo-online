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

// Using loose types — we lazy-load via importLibrary and only touch a small surface.
declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary: (name: string) => Promise<Record<string, unknown>>;
        Map?: unknown;
        Marker?: unknown;
      };
    };
    __koMapsBootstrap?: () => void;
  }
}

let bootstrapPromise: Promise<void> | null = null;
function loadMapsBootstrap(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (bootstrapPromise) return bootstrapPromise;
  if (!BROWSER_KEY) return Promise.reject(new Error("Maps browser key missing"));

  bootstrapPromise = new Promise((resolve, reject) => {
    // Google's official async bootstrap loader — resolves importLibrary reliably.
    // Ref: https://developers.google.com/maps/documentation/javascript/load-maps-js-api#dynamic-library-import
    const g = document.createElement("script");
    g.async = true;
    g.defer = true;
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      v: "weekly",
      libraries: "maps,marker",
      loading: "async",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    g.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    g.onload = () => {
      // The importLibrary API exists once the base script executes.
      if (window.google?.maps?.importLibrary) resolve();
      else reject(new Error("Google Maps loaded but importLibrary missing"));
    };
    g.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(g);
  });
  return bootstrapPromise;
}

async function loadMapClasses(): Promise<{
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => unknown;
  Marker: new (opts: Record<string, unknown>) => {
    getPosition(): { lat(): number; lng(): number };
    addListener(ev: string, cb: () => void): void;
  };
}> {
  await loadMapsBootstrap();
  const maps = window.google!.maps!;
  const mapsLib = (await maps.importLibrary("maps")) as {
    Map: new (el: HTMLElement, opts: Record<string, unknown>) => unknown;
  };
  const markerLib = (await maps.importLibrary("marker")) as {
    Marker: new (opts: Record<string, unknown>) => {
      getPosition(): { lat(): number; lng(): number };
      addListener(ev: string, cb: () => void): void;
    };
  };
  return { Map: mapsLib.Map, Marker: markerLib.Marker };
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
 * Tries multiple geocode strategies (full address → pincode+city → pincode-only)
 * to maximize hit rate on messy OCR addresses.
 */
export function MapPinPreview({
  address,
  pincode,
  city,
  state,
  onConfirm,
}: {
  address: string | null | undefined;
  pincode?: string | null;
  city?: string | null;
  state?: string | null;
  onConfirm: (r: MapPinResult) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pin, setPin] = useState<MapPinResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const runGeocode = useServerFn(geocodeFn);
  const runReverse = useServerFn(reverseGeocodeFn);

  useEffect(() => {
    if (!address && !pincode && !city) return;
    let cancelled = false;

    (async () => {
      setStatus("loading");
      setErrorMsg("");
      try {
        // Try progressively simpler queries until one geocodes successfully.
        const queries = [
          address,
          [address, pincode].filter(Boolean).join(", "),
          [city, state, pincode, "India"].filter(Boolean).join(", "),
          [pincode, "India"].filter(Boolean).join(", "),
        ].filter((q): q is string => typeof q === "string" && q.trim().length > 3);

        let lat = 0;
        let lng = 0;
        let found = false;
        for (const q of queries) {
          const g = await runGeocode({ data: { address: q } });
          if (cancelled) return;
          if (g.ok) {
            lat = g.lat;
            lng = g.lng;
            found = true;
            break;
          }
        }

        if (!found) {
          setStatus("error");
          setErrorMsg("Location detect nahi hui — Google Maps me pin manually drop karein");
          return;
        }

        const { Map, Marker } = await loadMapClasses();
        if (cancelled) return;
        const el = containerRef.current;
        if (!el) {
          setStatus("error");
          setErrorMsg("Map container missing");
          return;
        }
        const center = { lat, lng };
        const map = new Map(el, {
          center,
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        const marker = new Marker({
          position: center,
          map,
          draggable: true,
        });
        const initial: MapPinResult = { lat, lng, address: address ?? undefined, city: city ?? undefined, state: state ?? undefined, pincode: pincode ?? undefined };
        setPin(initial);
        setStatus("ready");

        marker.addListener("dragend", async () => {
          const p = marker.getPosition();
          const nlat = p.lat();
          const nlng = p.lng();
          const r = await runReverse({ data: { lat: nlat, lng: nlng } });
          if (r.ok && r.results?.[0]) {
            const res = r.results[0] as {
              formatted_address: string;
              address_components: { long_name: string; types: string[] }[];
            };
            const findComp = (t: string) =>
              res.address_components?.find((c) => c.types?.includes(t))?.long_name;
            setPin({
              lat: nlat,
              lng: nlng,
              address: res.formatted_address,
              city: findComp("locality") ?? findComp("administrative_area_level_2"),
              state: findComp("administrative_area_level_1"),
              pincode: findComp("postal_code"),
            });
          } else {
            setPin({ lat: nlat, lng: nlng });
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
  }, [address, pincode, city, state]);

  if (!address && !pincode && !city) return null;

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
      <div ref={containerRef} className="h-44 w-full bg-neutral-100 relative">
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="h-full w-full bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100 animate-pulse" />
          </div>
        )}
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
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try { navigator.vibrate(20); } catch { /* ignore */ }
              }
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
