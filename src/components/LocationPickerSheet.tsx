import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, MapPin, Clock, X, WifiOff, Navigation2, Building2, Ruler, Check, ChevronDown } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "sonner";

export type PickedLocation = { address: string; lat: number; lng: number };

const RECENTS_KEY = "karoonline.recent-locations.v1";
const MAX_RECENTS = 6;

/** Major Indian cities — quick-pick list with hard-coded lat/lng so we don't
 *  need an extra Geocoding round-trip for the common case. */
const INDIAN_CITIES: { name: string; state: string; lat: number; lng: number }[] = [
  { name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { name: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311 },
  { name: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319 },
  { name: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  { name: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
  { name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
  { name: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
  { name: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673 },
  { name: "Goa", state: "Goa", lat: 15.2993, lng: 74.124 },
  { name: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
  { name: "Ranchi", state: "Jharkhand", lat: 23.3441, lng: 85.3096 },
  { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185 },
  { name: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558 },
  { name: "Noida", state: "Uttar Pradesh", lat: 28.5355, lng: 77.391 },
  { name: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266 },
];

const DISTANCE_OPTIONS = [1, 5, 10, 20, 30, 50];

function loadRecents(): PickedLocation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as PickedLocation[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(p: PickedLocation) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadRecents().filter(
      (r) => !(Math.abs(r.lat - p.lat) < 1e-5 && Math.abs(r.lng - p.lng) < 1e-5),
    );
    const next = [p, ...existing].slice(0, MAX_RECENTS);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called as the user explores (city tap / suggestion tap). Map should fly
   *  to this location but the sheet remains open. */
  onPreview?: (loc: PickedLocation) => void;
  /** Called when the user confirms via the "Search here" button. */
  onPick: (loc: PickedLocation) => void;
  bias?: { lat: number; lng: number };
  currentLabel?: string;
  onUseCurrent?: () => void;
  radiusKm?: number;
  onRadiusChange?: (km: number) => void;
};

export function LocationPickerSheet({
  open,
  onClose,
  onPreview,
  onPick,
  bias,
  currentLabel,
  onUseCurrent,
  radiusKm = 10,
  onRadiusChange,
}: Props) {
  const online = useOnlineStatus();
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [recents, setRecents] = useState<PickedLocation[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [distancePickerOpen, setDistancePickerOpen] = useState(false);
  const [previewLoc, setPreviewLoc] = useState<PickedLocation | null>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
      setValue("");
      setCollapsed(false);
      setPreviewLoc(null);
      if (typeof document !== "undefined") {
        document.body.dataset.locationPickerOpen = "true";
      }
    } else {
      try {
        recogRef.current?.stop?.();
      } catch { /* noop */ }
      setListening(false);
      setCityPickerOpen(false);
      setDistancePickerOpen(false);
      if (typeof document !== "undefined") {
        delete document.body.dataset.locationPickerOpen;
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        delete document.body.dataset.locationPickerOpen;
      }
    };
  }, [open]);

  const startVoice = () => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice search not supported on this device"); return; }
    try {
      const r = new SR();
      r.lang = "en-IN";
      r.interimResults = true;
      r.continuous = false;
      r.onresult = (e: any) => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
        setValue(text);
      };
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      r.start();
      recogRef.current = r;
      setListening(true);
    } catch { setListening(false); }
  };

  const stopVoice = () => {
    try { recogRef.current?.stop?.(); } catch { /* noop */ }
    setListening(false);
  };

  /** Suggestion / city tap → preview only (sheet stays open, map flies). */
  const handlePreview = (res: PickedLocation) => {
    if (!online) {
      toast.error("Custom address search needs internet");
      return;
    }
    setPreviewLoc(res);
    onPreview?.(res);
    // collapse to quarter-height so the map gets visual focus
    setCollapsed(true);
    // close the on-screen keyboard
    if (typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
  };

  /** Confirm — commit the picked location and dismiss the sheet. */
  const handleConfirm = () => {
    if (!previewLoc) {
      toast.error("Pick a location first");
      return;
    }
    saveRecent(previewLoc);
    onPick(previewLoc);
    onClose();
  };

  if (!open) return null;

  // Heights: collapsed = quarter; expanded = ~78vh tall sheet (Ola/Uber-style)
  // so the search list stays visible while typing and above the keyboard.
  const sheetMaxH = collapsed ? "30vh" : "78vh";

  return (
    <div className="fixed inset-0 z-[130] flex flex-col justify-end pointer-events-none" aria-modal="true" role="dialog">
      {/* Top portion is *transparent and pass-through* so the map remains visible
          and interactive. Tap the small "Close" pill or the X to dismiss. */}
      <div className="flex-1 pointer-events-none" />

      {/* Sheet */}
      <div
        className="relative w-full bg-white rounded-t-3xl shadow-[0_-14px_40px_-10px_rgba(0,0,0,0.35)] flex flex-col pointer-events-auto animate-in slide-in-from-bottom duration-300"
        style={{
          maxHeight: sheetMaxH,
          height: sheetMaxH,
          minHeight: collapsed ? "180px" : "60vh",
          paddingBottom: "env(safe-area-inset-bottom)",
          transition: "max-height 280ms cubic-bezier(.22,1,.36,1), min-height 280ms cubic-bezier(.22,1,.36,1), height 280ms cubic-bezier(.22,1,.36,1)",
        }}
      >
        {/* Grab handle (drag to collapse/expand) */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand" : "Collapse"}
          className="pt-2.5 pb-1 grid place-items-center w-full"
        >
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </button>

        {/* Header */}
        <div className="px-4 pt-1 pb-2 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-slate-900 truncate">
              {previewLoc ? "Confirm Location" : "Choose Location"}
            </h2>
            <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
              {previewLoc ? previewLoc.address : "Search city, area or landmark"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-slate-100 active:scale-95 transition shrink-0"
          >
            <X className="h-4 w-4 text-slate-700" />
          </button>
        </div>

        {/* Offline banner */}
        {!online && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-[10.5px] text-amber-800">
            <WifiOff className="h-3.5 w-3.5" />
            Search needs internet
          </div>
        )}

        {/* Search bar */}
        <div className="px-4">
          <div className="relative">
            <PlacesAutocomplete
              value={value}
              onChange={(v) => { setValue(v); if (collapsed) setCollapsed(false); }}
              onSelect={handlePreview}
              placeholder="Search address, area, city…"
              bias={bias}
            />
            <button
              type="button"
              onClick={listening ? stopVoice : startVoice}
              aria-label={listening ? "Stop voice search" : "Start voice search"}
              className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-full transition ${
                listening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Quick chips: City picker · Distance picker · Use current */}
        <div className="px-4 mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCityPickerOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold active:scale-95"
          >
            <Building2 className="h-3.5 w-3.5" /> City <ChevronDown className="h-3 w-3" />
          </button>
          <button
            onClick={() => setDistancePickerOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold active:scale-95"
          >
            <Ruler className="h-3.5 w-3.5" /> {radiusKm} km <ChevronDown className="h-3 w-3" />
          </button>
          {onUseCurrent && (
            <button
              onClick={() => { onUseCurrent(); onClose(); }}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold active:scale-95"
            >
              <Navigation2 className="h-3.5 w-3.5" /> My GPS
            </button>
          )}
        </div>

        {/* Body — recents (hidden when collapsed for breathing room) */}
        {!collapsed && (
          <div className="mt-2 px-4 pb-3 overflow-y-auto flex-1">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Recent
            </h3>
            {recents.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No recent searches yet.</p>
            ) : (
              <ul className="space-y-1">
                {recents.map((r, i) => (
                  <li key={`${r.lat}-${r.lng}-${i}`}>
                    <button
                      onClick={() => handlePreview(r)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 active:bg-slate-100 text-left"
                    >
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="text-[11.5px] text-slate-700 truncate flex-1">{r.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Sticky confirm bar (visible when we have a preview) */}
        {previewLoc && (
          <div className="border-t border-slate-100 px-4 py-2.5 flex items-center gap-2 bg-white/95 backdrop-blur">
            <button
              onClick={() => { setPreviewLoc(null); setCollapsed(false); }}
              className="px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-600 bg-slate-100 active:scale-95"
            >
              Change
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[12.5px] py-2.5 shadow active:scale-[0.98]"
            >
              <Check className="h-4 w-4" /> Search vendors here · {radiusKm} km
            </button>
          </div>
        )}
      </div>

      {/* CITY PICKER sub-sheet */}
      {cityPickerOpen && (
        <div className="absolute inset-0 z-[140] flex items-end pointer-events-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCityPickerOpen(false)} />
          <div
            className="relative w-full bg-white rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ maxHeight: "70vh", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="pt-2.5 pb-1 grid place-items-center"><div className="h-1.5 w-12 rounded-full bg-slate-300" /></div>
            <div className="px-4 pb-2 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">Pick a city</h3>
              <button onClick={() => setCityPickerOpen(false)} className="h-8 w-8 grid place-items-center rounded-full bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-3 pb-4 overflow-y-auto grid grid-cols-2 gap-2">
              {INDIAN_CITIES.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    setCityPickerOpen(false);
                    handlePreview({ address: `${c.name}, ${c.state}`, lat: c.lat, lng: c.lng });
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left active:scale-[0.98] active:bg-slate-50"
                >
                  <div className="h-7 w-7 rounded-full bg-amber-100 grid place-items-center text-amber-700">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 truncate">{c.name}</div>
                    <div className="text-[9.5px] text-slate-500 truncate">{c.state}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DISTANCE PICKER sub-sheet */}
      {distancePickerOpen && (
        <div className="absolute inset-0 z-[140] flex items-end pointer-events-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDistancePickerOpen(false)} />
          <div
            className="relative w-full bg-white rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="pt-2.5 pb-1 grid place-items-center"><div className="h-1.5 w-12 rounded-full bg-slate-300" /></div>
            <div className="px-4 pb-2 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">Search radius</h3>
              <button onClick={() => setDistancePickerOpen(false)} className="h-8 w-8 grid place-items-center rounded-full bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-4 pb-5 grid grid-cols-3 gap-2">
              {DISTANCE_OPTIONS.map((km) => (
                <button
                  key={km}
                  onClick={() => {
                    onRadiusChange?.(km);
                    setDistancePickerOpen(false);
                    toast.success(`Searching within ${km} km`);
                  }}
                  className={`rounded-xl border px-3 py-3 text-center transition active:scale-95 ${
                    km === radiusKm
                      ? "border-amber-500 bg-amber-50 text-amber-900 font-bold"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div className="text-[16px] font-extrabold">{km}</div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">km</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
