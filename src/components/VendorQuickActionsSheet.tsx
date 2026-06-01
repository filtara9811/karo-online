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
      className="fixed inset-0 z-[60] bg-black/50 grid place-items-end touch-manipulation"
      onClick={onClose}
      style={{ animation: "overlay-in 0.25s ease-out", touchAction: "manipulation" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto rounded-t-3xl p-4 pb-6 max-h-[88vh] overflow-y-auto overscroll-contain touch-pan-y"
        style={{
          animation: "sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
          background: "linear-gradient(180deg, #fffaeb 0%, #fdf3c8 50%, #f5e9b8 100%)",
          border: "1.5px solid rgba(212,175,55,0.55)",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex justify-center mb-2">
          <span className="h-1 w-12 rounded-full bg-[color:oklch(0.78_0.14_82/0.55)]" />
        </div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ Quick Controls ✦
            </p>
            <h3 className="font-display text-lg text-gold-gradient font-bold">Duty & Acceptance</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white/80 border border-[color:oklch(0.78_0.14_82/0.4)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Online toggle */}
          <div className="w-full rounded-2xl bg-white/90 border border-[color:oklch(0.78_0.14_82/0.45)] p-3 flex items-center gap-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)]">
            <span
              className={`h-10 w-10 rounded-full grid place-items-center transition-colors ${vendor?.is_online ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
            >
              {saving.online ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">
                Vendor Status
              </p>
              <p className="text-sm font-display font-bold text-[color:oklch(0.22_0.05_85)] leading-tight">
                {vendor?.is_online ? "On Duty · Leads ON" : "Off Duty · Leads OFF"}
              </p>
              <p className="text-[10px] text-[color:oklch(0.45_0.05_85)] truncate">
                {vendor?.is_online
                  ? "Nearby requests aur ring alerts on hain"
                  : "Broadcast engine aapko skip karega"}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleOnline}
              role="switch"
              aria-checked={!!vendor?.is_online}
              aria-label="Vendor online status"
              disabled={saving.online}
              className={`relative h-8 w-16 rounded-full transition-colors flex-shrink-0 shadow-inner active:scale-95 touch-manipulation ${saving.online ? "bg-slate-400" : vendor?.is_online ? "bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.25),0_4px_12px_-2px_rgba(16,185,129,0.55)]" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 grid place-items-center ${saving.online ? "left-5" : vendor?.is_online ? "left-9" : "left-1"}`}
              >
                {saving.online && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
              </span>
              <span
                className={`absolute inset-y-0 grid place-items-center text-[9px] font-extrabold tracking-wider pointer-events-none ${saving.online ? "right-2 text-white" : vendor?.is_online ? "left-2 text-white" : "right-2 text-slate-500"}`}
              >
                {saving.online ? "..." : vendor?.is_online ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          {/* Auto accept */}
          <div className="w-full rounded-2xl bg-white/90 border border-[color:oklch(0.78_0.14_82/0.45)] p-3 flex items-center gap-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)]">
            <span
              className={`h-10 w-10 rounded-full grid place-items-center transition-colors ${vendor?.auto_accept_leads ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
            >
              {saving.auto ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Zap
                  className="h-5 w-5"
                  fill={vendor?.auto_accept_leads ? "currentColor" : "none"}
                />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">
                Auto Accept
              </p>
              <p className="text-sm font-display font-bold text-[color:oklch(0.22_0.05_85)] leading-tight">
                {vendor?.auto_accept_leads ? "Auto · ON" : "Manual"}
              </p>
              <p className="text-[10px] text-[color:oklch(0.45_0.05_85)] truncate">
                {vendor?.auto_accept_leads
                  ? "Har naya lead automatic accept ho raha hai"
                  : "Naye lead pe pop-up aayega — aap accept karein"}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleAuto}
              role="switch"
              aria-checked={!!vendor?.auto_accept_leads}
              aria-label="Auto accept leads"
              disabled={saving.auto}
              className={`relative h-8 w-16 rounded-full transition-colors flex-shrink-0 shadow-inner active:scale-95 touch-manipulation ${saving.auto ? "bg-slate-400" : vendor?.auto_accept_leads ? "bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.25),0_4px_12px_-2px_rgba(16,185,129,0.55)]" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 grid place-items-center ${saving.auto ? "left-5" : vendor?.auto_accept_leads ? "left-9" : "left-1"}`}
              >
                {saving.auto && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
              </span>
              <span
                className={`absolute inset-y-0 grid place-items-center text-[9px] font-extrabold tracking-wider pointer-events-none ${saving.auto ? "right-2 text-white" : vendor?.auto_accept_leads ? "left-2 text-white" : "right-2 text-slate-500"}`}
              >
                {saving.auto ? "..." : vendor?.auto_accept_leads ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          {/* Mode */}
          <div className="w-full rounded-2xl bg-white/90 border border-[color:oklch(0.78_0.14_82/0.45)] p-3 flex items-center gap-3 shadow-[0_4px_14px_-6px_rgba(212,175,55,0.4)]">
            <span
              className={`h-10 w-10 rounded-full grid place-items-center transition-colors ${isDynamic ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
            >
              {saving.mode ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MapPin className="h-5 w-5" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">
                Location Mode
              </p>
              <p className="text-sm font-display font-bold text-[color:oklch(0.22_0.05_85)] leading-tight">
                {isDynamic ? "Live GPS · Dynamic" : "Shop Address · Static"}
              </p>
              <p className="text-[10px] text-[color:oklch(0.45_0.05_85)] truncate">
                {isDynamic
                  ? "Aap jahan honge wahin se leads milengi"
                  : "Registered shop address se hi leads milengi"}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleMode}
              role="switch"
              aria-checked={isDynamic}
              aria-label="Location mode"
              disabled={saving.mode}
              className={`relative h-8 w-16 rounded-full transition-colors flex-shrink-0 shadow-inner active:scale-95 touch-manipulation ${saving.mode ? "bg-slate-400" : isDynamic ? "bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.25),0_4px_12px_-2px_rgba(16,185,129,0.55)]" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 grid place-items-center ${saving.mode ? "left-5" : isDynamic ? "left-9" : "left-1"}`}
              >
                {saving.mode && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
              </span>
              <span
                className={`absolute inset-y-0 grid place-items-center text-[9px] font-extrabold tracking-wider pointer-events-none ${saving.mode ? "right-2 text-white" : isDynamic ? "left-2 text-white" : "right-2 text-slate-500"}`}
              >
                {saving.mode ? "..." : isDynamic ? "ON" : "OFF"}
              </span>
            </button>
          </div>

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
              <span
                className="h-9 w-9 rounded-full grid place-items-center"
                style={{ background: "linear-gradient(180deg,#f5d97a,#d4af37,#8b6508)" }}
              >
                <Boxes className="h-4 w-4 text-[#1a1208]" />
              </span>
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">
                  Inventory
                </p>
                <p className="text-xs font-display font-bold text-[color:oklch(0.22_0.05_85)]">
                  Mapping
                </p>
              </div>
            </Link>
            <Link
              to="/vendor/shop"
              onClick={onClose}
              className="rounded-2xl bg-white/95 border border-[color:oklch(0.78_0.14_82/0.5)] p-3 flex items-center gap-2 shadow-sm active:scale-[0.97]"
            >
              <span
                className="h-9 w-9 rounded-full grid place-items-center"
                style={{ background: "linear-gradient(180deg,#fff8dc,#f5e9b8,#d4af37)" }}
              >
                <Store className="h-4 w-4 text-[#1a1208]" />
              </span>
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">
                  Digital
                </p>
                <p className="text-xs font-display font-bold text-[color:oklch(0.22_0.05_85)]">
                  Dukaan
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
