import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, X, Crosshair, Check, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import goldHome from "@/assets/gold-home.png";
import goldBriefcase from "@/assets/gold-briefcase.png";
import goldOther from "@/assets/gold-other.png";
import { INDIA_CITIES } from "@/lib/india-cities";
import { reverseGeocode } from "@/lib/google-maps";
import { toast } from "sonner";

export type AddressKind = "home" | "office" | "other";

export type AddressResult = {
  kind: AddressKind;
  label: string;
  full: string;
};

type Props = {
  open: boolean;
  onSelect: (a: AddressResult) => void;
  onClose: () => void;
};

type Stage = "kind" | "city" | "area" | "details";

export function AddressPicker({ open, onSelect, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("kind");
  const [kind, setKind] = useState<AddressKind>("home");
  const [city, setCity] = useState<string>("");
  const [cityState, setCityState] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");
  const [line, setLine] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [citySearch, setCitySearch] = useState("");
  const [otherCity, setOtherCity] = useState("");
  const [otherArea, setOtherArea] = useState("");
  const [showOtherCity, setShowOtherCity] = useState(false);
  const [showOtherArea, setShowOtherArea] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setStage("kind");
      setKind("home");
      setCity(""); setCityState(""); setArea(""); setLandmark(""); setLine(""); setPincode("");
      setCitySearch(""); setOtherCity(""); setOtherArea("");
      setShowOtherCity(false); setShowOtherArea(false); setGpsBusy(false);
      return;
    }
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return INDIA_CITIES;
    return INDIA_CITIES.filter((c) =>
      c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
    );
  }, [citySearch]);

  const currentCityEntry = useMemo(
    () => INDIA_CITIES.find((c) => c.name === city),
    [city]
  );

  const pickKind = (k: AddressKind) => {
    setKind(k);
    setStage("city");
  };

  const pickCity = (name: string, state: string) => {
    setCity(name); setCityState(state); setArea(""); setShowOtherCity(false);
    setStage("area");
  };

  const pickArea = (a: string) => {
    setArea(a); setShowOtherArea(false);
    setStage("details");
  };

  const useGps = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Browser GPS not available");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const txt = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (txt) {
            // Parse "Line, Area, City, State PIN, Country" loosely
            const parts = txt.split(",").map((s) => s.trim()).filter(Boolean);
            const last = parts[parts.length - 1] || "";
            // remove trailing country
            if (/india|country/i.test(last)) parts.pop();
            const cityStatePin = parts.pop() || "";
            const pinMatch = cityStatePin.match(/\b(\d{6})\b/);
            if (pinMatch) setPincode(pinMatch[1]);
            const detectedState = cityStatePin.replace(/\b\d{6}\b/, "").trim();
            // Try to match a city from our list
            const matchedCity = INDIA_CITIES.find((c) =>
              parts.some((p) => p.toLowerCase().includes(c.name.toLowerCase())) ||
              (detectedState && detectedState.toLowerCase().includes(c.state.toLowerCase()))
            );
            if (matchedCity) {
              setCity(matchedCity.name); setCityState(matchedCity.state);
              const matchedArea = matchedCity.areas.find((ar) =>
                parts.some((p) => p.toLowerCase().includes(ar.toLowerCase()))
              );
              if (matchedArea) setArea(matchedArea);
              else { setArea(parts[1] || parts[0] || ""); }
            } else {
              const detectedCity = parts[parts.length - 1] || "";
              setCity(detectedCity); setCityState(detectedState);
              setArea(parts[parts.length - 2] || "");
            }
            setLine(parts.slice(0, Math.max(0, parts.length - 2)).join(", "));
            setStage("details");
            toast.success("Location detected");
          } else {
            toast.error("Address not detected — please enter manually");
          }
        } catch {
          toast.error("Couldn't read GPS address");
        } finally {
          setGpsBusy(false);
        }
      },
      (err) => {
        setGpsBusy(false);
        const msg = err.code === err.PERMISSION_DENIED
          ? "Location permission denied"
          : "Couldn't get your location";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const finalAddress = useMemo(() => {
    const bits = [line, landmark, area, city, cityState, pincode].map((s) => s?.trim()).filter(Boolean);
    return bits.join(", ");
  }, [line, landmark, area, city, cityState, pincode]);

  const ready = !!city && !!area && line.trim().length >= 3;

  const save = () => {
    const label = kind === "home" ? "Home" : kind === "office" ? "Office" : "Other";
    onSelect({ kind, label, full: finalAddress });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <motion.button
        aria-label="Close"
        onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        className="glass-sheet relative w-full max-w-md rounded-t-3xl px-5 pt-3 pb-7 max-h-[88vh] flex flex-col"
      >
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#f5d97a] to-transparent opacity-70" />

        {/* Header */}
        <div className="text-center mb-3">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.84_0.15_85/0.7)] mb-1">
            ✦ Address ✦
          </p>
          <h2 className="font-display text-xl text-gold-gradient leading-tight">
            {stage === "kind" && "Choose your location"}
            {stage === "city" && "Select your city"}
            {stage === "area" && `Select area in ${city}`}
            {stage === "details" && "Add address details"}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground italic">
            {stage === "kind" && "Home, Office or live GPS"}
            {stage === "city" && "Type or pick from the list"}
            {stage === "area" && "Locality / neighbourhood"}
            {stage === "details" && "Flat, street, landmark, PIN"}
          </p>
        </div>

        {/* Breadcrumb back chips */}
        {stage !== "kind" && (
          <div className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[color:oklch(0.42_0.10_82)]">
            <button onClick={() => setStage("kind")} className="px-2 py-1 rounded-full bg-white/70 border border-[color:oklch(0.78_0.14_82/0.45)]">
              {kind}
            </button>
            {city && (
              <>
                <ChevronRight className="h-3 w-3 opacity-60" />
                <button onClick={() => setStage("city")} className="px-2 py-1 rounded-full bg-white/70 border border-[color:oklch(0.78_0.14_82/0.45)]">
                  {city}
                </button>
              </>
            )}
            {area && (
              <>
                <ChevronRight className="h-3 w-3 opacity-60" />
                <button onClick={() => setStage("area")} className="px-2 py-1 rounded-full bg-white/70 border border-[color:oklch(0.78_0.14_82/0.45)]">
                  {area}
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          <AnimatePresence mode="wait">
            {/* STAGE 1: KIND */}
            {stage === "kind" && (
              <motion.div key="kind" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                <button
                  type="button"
                  onClick={useGps}
                  disabled={gpsBusy}
                  className="w-full mb-3 rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition border-2 border-emerald-400/70 bg-gradient-to-r from-emerald-50 to-white shadow-[0_4px_14px_-4px_rgba(16,185,129,0.45)]"
                >
                  <span className="h-10 w-10 rounded-full grid place-items-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                    {gpsBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crosshair className="h-5 w-5" />}
                  </span>
                  <div className="flex-1 text-left">
                    <div className="font-display text-sm font-bold text-emerald-900">
                      {gpsBusy ? "Detecting your location…" : "Use live GPS location"}
                    </div>
                    <div className="text-[11px] text-emerald-700/80">
                      Accurate · Auto-fills city, area, PIN code
                    </div>
                  </div>
                </button>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { kind: "home" as const, icon: goldHome, label: "Home" },
                    { kind: "office" as const, icon: goldBriefcase, label: "Office" },
                    { kind: "other" as const, icon: goldOther, label: "Other" },
                  ].map((t, i) => (
                    <button
                      key={t.kind}
                      onClick={() => pickKind(t.kind)}
                      className="btn-3d group relative flex flex-col items-center gap-2 rounded-2xl px-2 py-4 bg-gradient-to-br from-white to-[#fffaf0] border border-[color:oklch(0.78_0.14_82/0.5)] hover:border-[color:oklch(0.78_0.14_82)] hover:shadow-gold-glow transition-all"
                      style={{ animation: `fade-up 0.45s ease-out ${i * 0.06}s both` }}
                    >
                      <div className="relative h-14 w-14 rounded-xl grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow">
                        <img src={t.icon} alt="" className="h-11 w-11 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="font-display text-sm text-gold-gradient leading-tight">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground -mt-1">Tap to start</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STAGE 2: CITY */}
            {stage === "city" && (
              <motion.div key="city" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                <div className="flex items-center gap-2 rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.55)] bg-white/90 px-3 py-2.5 mb-3">
                  <Search className="h-4 w-4 text-[color:oklch(0.55_0.10_82)] shrink-0" />
                  <input
                    autoFocus
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Search city or state…"
                    className="flex-1 bg-transparent outline-none text-sm font-semibold text-[color:oklch(0.24_0.06_85)] placeholder:font-normal placeholder:text-[color:oklch(0.55_0.08_85/0.6)]"
                  />
                  {citySearch && (
                    <button onClick={() => setCitySearch("")} aria-label="Clear">
                      <X className="h-4 w-4 text-[color:oklch(0.55_0.10_82)]" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {filteredCities.map((c) => (
                    <button
                      key={c.name + c.state}
                      onClick={() => pickCity(c.name, c.state)}
                      className={`w-full rounded-xl px-3 py-2.5 flex items-center gap-3 border bg-white/85 hover:bg-white active:scale-[0.99] transition text-left ${
                        c.name === city ? "border-[color:oklch(0.78_0.14_82)] shadow-[0_0_0_2px_rgba(212,175,55,0.25)]" : "border-[color:oklch(0.78_0.14_82/0.35)]"
                      }`}
                    >
                      <MapPin className="h-4 w-4 text-[color:oklch(0.55_0.15_82)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[color:oklch(0.24_0.06_85)] truncate">{c.name}</div>
                        <div className="text-[11px] text-[color:oklch(0.50_0.08_85)] truncate">{c.state}</div>
                      </div>
                      {c.name === city && <Check className="h-4 w-4 text-emerald-600" />}
                    </button>
                  ))}

                  {/* Other city */}
                  {!showOtherCity ? (
                    <button
                      onClick={() => setShowOtherCity(true)}
                      className="w-full rounded-xl px-3 py-2.5 flex items-center gap-3 border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.55)] bg-[#fffdf2] hover:bg-white text-left"
                    >
                      <span className="h-7 w-7 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5d97a]">
                        <img src={goldOther} alt="" className="h-5 w-5 object-contain" />
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-[color:oklch(0.30_0.10_82)]">Other city — type manually</div>
                        <div className="text-[11px] text-muted-foreground">Not in the list? Add yours</div>
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-xl border-2 border-[color:oklch(0.78_0.14_82)] bg-[#fffdf2] p-3 space-y-2">
                      <input
                        autoFocus
                        value={otherCity}
                        onChange={(e) => setOtherCity(e.target.value)}
                        placeholder="City name"
                        className="w-full rounded-lg border border-[color:oklch(0.78_0.14_82/0.55)] bg-white px-3 py-2 text-sm outline-none"
                      />
                      <input
                        value={cityState}
                        onChange={(e) => setCityState(e.target.value)}
                        placeholder="State"
                        className="w-full rounded-lg border border-[color:oklch(0.78_0.14_82/0.55)] bg-white px-3 py-2 text-sm outline-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowOtherCity(false)} className="flex-1 rounded-lg py-2 text-xs uppercase tracking-widest border border-[color:oklch(0.78_0.14_82/0.55)] bg-white">Cancel</button>
                        <button
                          disabled={otherCity.trim().length < 2}
                          onClick={() => pickCity(otherCity.trim(), cityState.trim() || "—")}
                          className="flex-[2] rounded-lg py-2 text-xs uppercase tracking-widest font-bold text-[color:oklch(0.18_0.06_18)] disabled:opacity-50"
                          style={{ background: "linear-gradient(180deg,#fff3c8,#f5d97a 50%,#d4af37)" }}
                        >
                          Use this city
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STAGE 3: AREA */}
            {stage === "area" && currentCityEntry && (
              <motion.div key="area" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                <div className="grid grid-cols-2 gap-2">
                  {currentCityEntry.areas.map((a) => (
                    <button
                      key={a}
                      onClick={() => pickArea(a)}
                      className={`rounded-xl px-3 py-3 text-sm font-bold text-left border bg-white/85 active:scale-[0.99] transition ${
                        a === area ? "border-[color:oklch(0.78_0.14_82)] text-[color:oklch(0.22_0.06_85)] shadow-[0_0_0_2px_rgba(212,175,55,0.25)]" : "border-[color:oklch(0.78_0.14_82/0.35)] text-[color:oklch(0.30_0.06_85)]"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  {!showOtherArea ? (
                    <button
                      onClick={() => setShowOtherArea(true)}
                      className="w-full rounded-xl px-3 py-2.5 flex items-center gap-3 border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.55)] bg-[#fffdf2] text-left"
                    >
                      <span className="h-7 w-7 rounded-full grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5d97a]">
                        <img src={goldOther} alt="" className="h-5 w-5 object-contain" />
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-[color:oklch(0.30_0.10_82)]">Other area — type manually</div>
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-xl border-2 border-[color:oklch(0.78_0.14_82)] bg-[#fffdf2] p-3 space-y-2">
                      <input
                        autoFocus
                        value={otherArea}
                        onChange={(e) => setOtherArea(e.target.value)}
                        placeholder="Area / locality name"
                        className="w-full rounded-lg border border-[color:oklch(0.78_0.14_82/0.55)] bg-white px-3 py-2 text-sm outline-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowOtherArea(false)} className="flex-1 rounded-lg py-2 text-xs uppercase tracking-widest border border-[color:oklch(0.78_0.14_82/0.55)] bg-white">Cancel</button>
                        <button
                          disabled={otherArea.trim().length < 2}
                          onClick={() => pickArea(otherArea.trim())}
                          className="flex-[2] rounded-lg py-2 text-xs uppercase tracking-widest font-bold text-[color:oklch(0.18_0.06_18)] disabled:opacity-50"
                          style={{ background: "linear-gradient(180deg,#fff3c8,#f5d97a 50%,#d4af37)" }}
                        >
                          Use this area
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STAGE 4: DETAILS */}
            {stage === "details" && (
              <motion.div key="details" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="space-y-2.5">
                <div className="flex items-start gap-3 rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.55)] bg-white/90 px-4 py-3">
                  <MapPin className="mt-1 h-5 w-5 text-[color:oklch(0.55_0.15_82)]" strokeWidth={2.4} />
                  <textarea
                    autoFocus
                    value={line}
                    onChange={(e) => setLine(e.target.value)}
                    rows={2}
                    placeholder="Flat / House no., Street, Building"
                    className="flex-1 resize-none bg-transparent text-sm font-semibold text-[color:oklch(0.24_0.06_85)] placeholder:font-normal placeholder:text-[color:oklch(0.55_0.08_85/0.6)] outline-none"
                  />
                </div>
                <input
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Nearby landmark (optional)"
                  className="w-full rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.55)] bg-white/90 px-4 py-3 text-sm font-semibold text-[color:oklch(0.24_0.06_85)] placeholder:font-normal placeholder:text-[color:oklch(0.55_0.08_85/0.6)] outline-none"
                />
                <input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="PIN code (6 digits)"
                  className="w-full rounded-2xl border-2 border-[color:oklch(0.78_0.14_82/0.55)] bg-white/90 px-4 py-3 text-sm font-semibold text-[color:oklch(0.24_0.06_85)] placeholder:font-normal placeholder:text-[color:oklch(0.55_0.08_85/0.6)] outline-none tracking-widest"
                />

                {finalAddress && (
                  <div className="rounded-2xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.55)] px-4 py-2.5">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-[color:oklch(0.45_0.10_82)] mb-1">Preview</div>
                    <div className="text-xs font-semibold text-[color:oklch(0.24_0.06_85)] leading-snug">{finalAddress}</div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="pt-3 mt-2 border-t border-[color:oklch(0.78_0.14_82/0.25)] flex gap-2">
          {stage === "details" ? (
            <>
              <button
                onClick={() => setStage("area")}
                className="flex-1 rounded-xl py-2.5 text-xs uppercase tracking-[0.3em] border border-[color:oklch(0.78_0.14_82/0.45)] bg-white/70"
              >
                Back
              </button>
              <button
                disabled={!ready}
                onClick={save}
                className="btn-3d flex-[2] rounded-xl py-2.5 font-display font-bold text-sm tracking-wide text-[color:oklch(0.18_0.06_18)] disabled:opacity-50"
                style={{ background: "linear-gradient(180deg,#fff3c8 0%,#f5d97a 35%,#d4af37 70%,#8b6508 100%)", boxShadow: "0 6px 16px -4px rgba(212,175,55,0.55), inset 0 1px 0 rgba(255,255,255,0.7)" }}
              >
                Save Address
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full text-center text-xs uppercase tracking-[0.3em] text-[color:oklch(0.45_0.10_82)] py-2"
            >
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
