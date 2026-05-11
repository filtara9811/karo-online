import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import {
  placesAutocomplete,
  placeDetails,
  newSessionToken,
  type PlacePrediction,
} from "@/lib/google-maps";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (result: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  bias?: { lat: number; lng: number };
  className?: string;
};

/**
 * Address input with Google Places Autocomplete (India-biased).
 * Falls back gracefully when the API key isn't configured (acts as plain input).
 */
export function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search address, area, landmark…",
  bias,
  className = "",
}: Props) {
  const [preds, setPreds] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const tokenRef = useRef<string>(newSessionToken());
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!value || value.trim().length < 2) {
      setPreds([]);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      const r = await placesAutocomplete(value, {
        sessionToken: tokenRef.current,
        bias,
      });
      setPreds(r);
      setLoading(false);
      setOpen(r.length > 0);
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const choose = async (p: PlacePrediction) => {
    setOpen(false);
    onChange(p.description);
    const det = await placeDetails(p.place_id, tokenRef.current);
    tokenRef.current = newSessionToken(); // new session after each selection
    if (det && onSelect) onSelect(det);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => preds.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {open && preds.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-50 max-h-64 overflow-auto rounded-xl border border-border bg-popover shadow-lg">
          {preds.map((p) => (
            <li key={p.place_id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2"
              >
                <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.main_text}</p>
                  {p.secondary_text && (
                    <p className="text-xs text-muted-foreground truncate">
                      {p.secondary_text}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
