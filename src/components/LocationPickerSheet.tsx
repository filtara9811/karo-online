import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, MapPin, Clock, X, WifiOff, Loader2, Navigation2 } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "sonner";

export type PickedLocation = { address: string; lat: number; lng: number };

const RECENTS_KEY = "karoonline.recent-locations.v1";
const MAX_RECENTS = 6;

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
  onPick: (loc: PickedLocation) => void;
  bias?: { lat: number; lng: number };
  currentLabel?: string;
  onUseCurrent?: () => void;
};

export function LocationPickerSheet({ open, onClose, onPick, bias, currentLabel, onUseCurrent }: Props) {
  const online = useOnlineStatus();
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [recents, setRecents] = useState<PickedLocation[]>([]);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
      setValue("");
      if (typeof document !== "undefined") {
        document.body.dataset.locationPickerOpen = "true";
      }
    } else {
      try {
        recogRef.current?.stop?.();
      } catch { /* noop */ }
      setListening(false);
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
    if (!SR) {
      toast.error("Voice search not supported on this device");
      return;
    }
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
    } catch {
      setListening(false);
    }
  };

  const stopVoice = () => {
    try { recogRef.current?.stop?.(); } catch { /* noop */ }
    setListening(false);
  };

  const handleSelect = (res: { address: string; lat: number; lng: number }) => {
    if (!online) {
      toast.error("Custom address search needs internet");
      return;
    }
    saveRecent(res);
    onPick(res);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="relative w-full bg-white rounded-t-3xl shadow-[0_-12px_36px_-8px_rgba(0,0,0,0.35)] flex flex-col max-h-[88vh] animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Grab handle */}
        <div className="pt-2.5 pb-1 grid place-items-center">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-4 pt-1 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Choose Location</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Search any city — Delhi, Mumbai, Hyderabad, Bangalore, Jaipur…
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 grid place-items-center rounded-full bg-slate-100 active:scale-95 transition"
          >
            <X className="h-4 w-4 text-slate-700" />
          </button>
        </div>

        {/* Offline banner */}
        {!online && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
            <WifiOff className="h-3.5 w-3.5" />
            Custom address search needs internet. Connect to search a different area.
          </div>
        )}

        {/* Search bar with voice */}
        <div className="px-4">
          <div className="relative">
            <PlacesAutocomplete
              value={value}
              onChange={setValue}
              onSelect={handleSelect}
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
          {listening && (
            <p className="mt-1.5 text-[11px] text-red-600 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Listening…
            </p>
          )}
        </div>

        {/* Use current location */}
        {onUseCurrent && (
          <button
            onClick={() => { onUseCurrent(); onClose(); }}
            className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5 active:scale-[0.99] transition text-left"
          >
            <div className="h-8 w-8 grid place-items-center rounded-full bg-blue-500/10 text-blue-600">
              <Navigation2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-slate-900">Use my current location</div>
              <div className="text-[10.5px] text-slate-500 truncate">{currentLabel || "Detecting GPS…"}</div>
            </div>
          </button>
        )}

        {/* Recents */}
        <div className="mt-3 px-4 pb-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Recent Searches
            </h3>
            {recents.length > 0 && (
              <button
                onClick={() => {
                  try { window.localStorage.removeItem(RECENTS_KEY); } catch {}
                  setRecents([]);
                }}
                className="text-[10px] text-slate-400 active:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
          {recents.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No recent searches yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {recents.map((r, i) => (
                <li key={`${r.lat}-${r.lng}-${i}`}>
                  <button
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-slate-50 active:bg-slate-100 text-left"
                  >
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="text-[12px] text-slate-700 truncate flex-1">{r.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
