import { Link } from "@tanstack/react-router";
import { X, Bell, Zap, Loader2, Boxes, MapPin, Store } from "lucide-react";
import { RadiusSlider } from "@/components/RadiusSlider";

type V = {
  is_online?: boolean | null;
  auto_accept_leads?: boolean | null;
  operation_mode?: string | null;
  service_radius_km?: number | null;
};

export function VendorQuickActionsSheet({
  open,
  onClose,
  vendor,
  saving,
  onToggleOnline,
  onToggleAuto,
  onToggleMode,
  onRadius,
}: {
  open: boolean;
  onClose: () => void;
  vendor: V | null;
  saving: { online: boolean; auto: boolean; mode: boolean; radius: boolean };
  onToggleOnline: () => void;
  onToggleAuto: () => void;
  onToggleMode: () => void;
  onRadius: (km: number) => void;
}) {
  if (!open) return null;
  const isDynamic = vendor?.operation_mode === "dynamic";
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 grid place-items-end"
      onClick={onClose}
      style={{ animation: "overlay-in 0.25s ease-out" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto rounded-t-3xl p-4 pb-6 max-h-[88vh] overflow-y-auto"
        style={{
          animation: "sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
          background:
            "linear-gradient(180deg, #fffaeb 0%, #fdf3c8 50%, #f5e9b8 100%)",
          border: "1.5px solid rgba(212,175,55,0.55)",
        }}
      >
        <div className="flex justify-center mb-2">
          <span className="h-1 w-12 rounded-full bg-[color:oklch(0.78_0.14_82/0.55)]" />
        </div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">✦ Quick Controls ✦</p>
            <h3 className="font-display text-lg text-gold-gradient font-bold">Duty & Acceptance</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full bg-white/80 border border-[color:oklch(0.78_0.14_82/0.4)] active:scale-90">
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Online toggle */}
          <button
            type="button"
            onClick={onToggleOnline}
            className="w-full rounded-2xl bg-white/90 border border-[color:oklch(0.78_0.14_82/0.45)] p-3 flex items-center gap-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)] active:scale-[0.99] text-left"
          >
            <span className={`h-10 w-10 rounded-full grid place-items-center ${vendor?.is_online ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {saving.online ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">Vendor Status</p>
              <p className="text-sm font-display font-bold text-[color:oklch(0.22_0.05_85)] leading-tight">
                {vendor?.is_online ? "On Duty · Leads ON" : "Off Duty · Leads OFF"}
              </p>
              <p className="text-[10px] text-[color:oklch(0.45_0.05_85)] truncate">
                {vendor?.is_online ? "Nearby requests aur ring alerts on hain" : "Broadcast engine aapko skip karega"}
              </p>
            </div>
            <span
              role="switch"
              aria-checked={!!vendor?.is_online}
              className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 ${vendor?.is_online ? "bg-emerald-500" : "bg-amber-400"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${vendor?.is_online ? "translate-x-5" : ""}`} />
            </span>
          </button>

          {/* Auto accept */}
          <button
            type="button"
            onClick={onToggleAuto}
            className="w-full rounded-2xl bg-white/90 border border-[color:oklch(0.78_0.14_82/0.45)] p-3 flex items-center gap-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)] active:scale-[0.99] text-left"
          >
            <span className={`h-10 w-10 rounded-full grid place-items-center ${vendor?.auto_accept_leads ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {saving.auto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" fill={vendor?.auto_accept_leads ? "currentColor" : "none"} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">Auto Accept</p>
              <p className="text-sm font-display font-bold text-[color:oklch(0.22_0.05_85)] leading-tight">
                {vendor?.auto_accept_leads ? "Auto · ON" : "Manual"}
              </p>
              <p className="text-[10px] text-[color:oklch(0.45_0.05_85)] truncate">
                {vendor?.auto_accept_leads ? "Har naya lead automatic accept ho raha hai" : "Naye lead pe pop-up aayega — aap accept karein"}
              </p>
            </div>
            <span
              role="switch"
              aria-checked={!!vendor?.auto_accept_leads}
              className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 ${vendor?.auto_accept_leads ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${vendor?.auto_accept_leads ? "translate-x-5" : ""}`} />
            </span>
          </button>

          {/* Mode */}
          <button
            type="button"
            onClick={onToggleMode}
            className="w-full rounded-2xl bg-white/90 border border-[color:oklch(0.78_0.14_82/0.45)] p-3 flex items-center gap-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)] active:scale-[0.99] text-left"
          >
            <span className={`h-10 w-10 rounded-full grid place-items-center ${isDynamic ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
              {saving.mode ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">Location Mode</p>
              <p className="text-sm font-display font-bold text-[color:oklch(0.22_0.05_85)] leading-tight">
                {isDynamic ? "Live GPS · Dynamic" : "Shop Address · Static"}
              </p>
              <p className="text-[10px] text-[color:oklch(0.45_0.05_85)] truncate">
                {isDynamic ? "Aap jahan honge wahin se leads milengi" : "Registered shop address se hi leads milengi"}
              </p>
            </div>
            <span
              role="switch"
              aria-checked={isDynamic}
              className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 ${isDynamic ? "bg-sky-500" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isDynamic ? "translate-x-5" : ""}`} />
            </span>
          </button>

          {/* Radius */}
          <div className="rounded-2xl bg-white/90 border border-[color:oklch(0.78_0.14_82/0.45)] p-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)]">
            <RadiusSlider
              value={vendor?.service_radius_km ?? 10}
              onChange={onRadius}
              label={`Service radius${saving.radius ? " · saving…" : ""}`}
            />
            <p className="text-[10px] text-[color:oklch(0.45_0.05_85)] mt-2 leading-snug">
              Sirf iss radius ke andar wale leads aayenge. Unlimited (∞) = poora area cover.
            </p>
          </div>

          {/* Shortcuts */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Link
              to="/vendor/services"
              onClick={onClose}
              className="rounded-2xl bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] p-3 flex items-center gap-2 shadow-sm active:scale-[0.97]"
            >
              <span className="h-9 w-9 rounded-full grid place-items-center" style={{ background: "linear-gradient(180deg,#f5d97a,#d4af37,#8b6508)" }}>
                <Boxes className="h-4 w-4 text-[#1a1208]" />
              </span>
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">Inventory</p>
                <p className="text-xs font-display font-bold text-[color:oklch(0.22_0.05_85)]">Mapping</p>
              </div>
            </Link>
            <Link
              to="/vendor/shop"
              onClick={onClose}
              className="rounded-2xl bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] p-3 flex items-center gap-2 shadow-sm active:scale-[0.97]"
            >
              <span className="h-9 w-9 rounded-full grid place-items-center" style={{ background: "linear-gradient(180deg,#fff8dc,#f5e9b8,#d4af37)" }}>
                <Store className="h-4 w-4 text-[#1a1208]" />
              </span>
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">Digital</p>
                <p className="text-xs font-display font-bold text-[color:oklch(0.22_0.05_85)]">Dukaan</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
