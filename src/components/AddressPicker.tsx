import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import goldHome from "@/assets/gold-home.png";
import goldBriefcase from "@/assets/gold-briefcase.png";
import goldOther from "@/assets/gold-other.png";

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

const AUTO_HOME = "12, Marine Drive, Mumbai, MH 400020";
const AUTO_OFFICE = "Tower B, BKC, Bandra East, Mumbai, MH 400051";

export function AddressPicker({ open, onSelect, onClose }: Props) {
  const [mode, setMode] = useState<null | "other">(null);
  const [manual, setManual] = useState("");
  const [detecting, setDetecting] = useState<AddressKind | null>(null);

  useEffect(() => {
    if (!open) {
      setMode(null);
      setManual("");
      setDetecting(null);
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const pick = (kind: AddressKind, full: string, label: string) => {
    setDetecting(kind);
    setTimeout(() => onSelect({ kind, label, full }), 700);
  };

  const tiles: { kind: AddressKind; icon: string; label: string; sub: string; full: string }[] = [
    { kind: "home", icon: goldHome, label: "Home", sub: "Auto-detected", full: AUTO_HOME },
    { kind: "office", icon: goldBriefcase, label: "Office", sub: "Auto-detected", full: AUTO_OFFICE },
    { kind: "other", icon: goldOther, label: "Other", sub: "Type manually", full: "" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="glass-sheet relative w-full max-w-md rounded-t-3xl px-5 pt-3 pb-8"
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#f5d97a] to-transparent opacity-70" />

        <div className="text-center mb-5">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:oklch(0.84_0.15_85/0.7)] mb-1">
            ✦ Address ✦
          </p>
          <h2 className="font-display text-2xl text-gold-gradient leading-tight">
            {mode === "other" ? "Type your address" : "Choose your location"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground italic">
            {mode === "other" ? "Enter exact delivery address" : "We auto-detect Home & Office"}
          </p>
        </div>

        {mode !== "other" && (
          <div className="grid grid-cols-3 gap-3">
            {tiles.map((t, i) => {
              const isDetecting = detecting === t.kind;
              return (
                <button
                  key={t.kind}
                  onClick={() => {
                    if (t.kind === "other") setMode("other");
                    else pick(t.kind, t.full, t.label);
                  }}
                  className="btn-3d group relative flex flex-col items-center gap-2 rounded-2xl px-2 py-4 bg-gradient-to-br from-white to-[#fffaf0] border border-[color:oklch(0.78_0.14_82/0.5)] hover:border-[color:oklch(0.78_0.14_82)] hover:shadow-gold-glow transition-all"
                  style={{ animation: `fade-up 0.45s ease-out ${i * 0.06}s both` }}
                >
                  <div className="relative h-14 w-14 rounded-xl grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] border border-[color:oklch(0.78_0.14_82/0.5)] shadow-gold-glow">
                    <img
                      src={t.icon}
                      alt=""
                      className="h-11 w-11 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform"
                    />
                    {isDetecting && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest text-[color:oklch(0.42_0.10_82)] bg-white/90 px-1.5 py-0.5 rounded">
                        locating…
                      </span>
                    )}
                  </div>
                  <p className="font-display text-sm text-gold-gradient leading-tight">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground -mt-1">{t.sub}</p>
                </button>
              );
            })}
          </div>
        )}

        {mode === "other" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-[color:oklch(0.78_0.14_82/0.5)] bg-white/80 px-4 py-3">
              <MapPin className="mt-1 h-5 w-5 text-[color:oklch(0.55_0.15_82)]" strokeWidth={2.4} />
              <textarea
                autoFocus
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                rows={3}
                placeholder="Flat / House no., Street, Area, City, Pincode"
                className="flex-1 resize-none bg-transparent text-sm text-[color:oklch(0.28_0.06_85)] placeholder:text-[color:oklch(0.45_0.08_85/0.7)] outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode(null)}
                className="flex-1 rounded-xl py-2.5 text-xs uppercase tracking-[0.3em] text-[color:oklch(0.45_0.10_85)] border border-[color:oklch(0.78_0.14_82/0.45)] bg-white/70"
              >
                Back
              </button>
              <button
                disabled={manual.trim().length < 6}
                onClick={() => onSelect({ kind: "other", label: "Other", full: manual.trim() })}
                className="btn-3d flex-[2] rounded-xl py-2.5 font-display font-bold text-sm tracking-wide text-[color:oklch(0.18_0.06_18)] disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(180deg, #fff3c8 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)",
                  boxShadow: "0 6px 16px -4px rgba(212,175,55,0.55), inset 0 1px 0 rgba(255,255,255,0.7)",
                }}
              >
                Save Address
              </button>
            </div>
          </div>
        )}

        {mode !== "other" && (
          <button
            onClick={onClose}
            className="mt-5 w-full text-center text-xs uppercase tracking-[0.3em] text-[color:oklch(0.84_0.15_85/0.6)] hover:text-[color:oklch(0.84_0.15_85)] py-2 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
