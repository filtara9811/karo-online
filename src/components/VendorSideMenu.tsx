import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  X, User, Wallet, Store, Bell, LifeBuoy, FileText,
  LogOut, Gift, Megaphone, Settings as SettingsIcon, ChevronRight,
  LayoutGrid, Briefcase, ShieldCheck, Instagram, Download,
} from "lucide-react";
import avatarUser from "@/assets/avatar-user.png";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Vendor = {
  business_name?: string | null;
  owner_name?: string | null;
  avatar_url?: string | null;
  status?: string | null;
  verified?: boolean | null;
};

const KYC_FIELDS = [
  "business_name", "owner_name", "role", "entity", "trade",
  "deals_in", "email", "whatsapp", "gst", "pan", "aadhaar",
] as const;

const ROWS: Array<{ id: string; label: string; sub: string; Icon: typeof User; to?: string; search?: Record<string, unknown> }> = [
  { id: "dashboard", label: "Dashboard", sub: "Leads · stats", Icon: LayoutGrid, to: "/vendor/dashboard" },
  { id: "install", label: "Install Vendor App", sub: "Alag icon · home screen", Icon: Download, to: "/vendor/install" },
  { id: "services", label: "My Services", sub: "Categories", Icon: Briefcase, to: "/vendor/services" },
  { id: "wallet", label: "Wallet", sub: "Coins · recharge", Icon: Wallet, to: "/vendor/wallet" },
  { id: "shop", label: "Digital Shop", sub: "Products · variations", Icon: Store, to: "/vendor/shop" },
  { id: "business", label: "Business Details", sub: "Edit your profile", Icon: User, to: "/vendor/register", search: { edit: "1" } },
  { id: "social", label: "Social | Pages", sub: "Instagram · FB · website", Icon: Instagram, to: "/vendor/social" },
  { id: "kyc", label: "KYC | Details", sub: "Aadhaar · PAN · GST", Icon: ShieldCheck, to: "/vendor/kyc" },
  { id: "notifications", label: "Notifications", sub: "Alerts", Icon: Bell },
  { id: "promotions", label: "Promotions", sub: "Offers · banners", Icon: Megaphone },
  { id: "referral", label: "Refer & Earn", sub: "Invite vendors", Icon: Gift },
  { id: "support", label: "Support", sub: "Help center", Icon: LifeBuoy },
  { id: "legal", label: "Legal", sub: "Terms · privacy", Icon: FileText },
  { id: "settings", label: "Settings", sub: "Theme · language", Icon: SettingsIcon },
];

export function VendorSideMenu({
  open, onClose, vendor,
}: { open: boolean; onClose: () => void; vendor?: Vendor | null }) {
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();
  const [kycPct, setKycPct] = useState<number>(0);
  const [fullVendor, setFullVendor] = useState<Record<string, any> | null>(null);

  // Fetch full vendor row to compute KYC progress when menu opens
  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("vendors")
      .select("business_name, owner_name, role, entity, trade, deals_in, email, whatsapp, gst, pan, aadhaar, avatar_url, status, verified")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullVendor(data as any);
        if (data) {
          const filled = KYC_FIELDS.filter((f) => {
            const v = (data as any)[f];
            return typeof v === "string" ? v.trim().length > 0 : v != null;
          }).length;
          setKycPct(Math.round((filled / KYC_FIELDS.length) * 100));
        } else {
          setKycPct(0);
        }
      });
  }, [open, user]);

  const v = fullVendor ?? vendor ?? null;
  const name = v?.business_name || profile?.name || "My Business";
  const owner = v?.owner_name || profile?.name || "Vendor";
  const avatar = v?.avatar_url || profile?.avatar_url || avatarUser;
  const verified = !!v?.verified;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed left-0 right-0 bottom-0 z-[61] mx-auto w-full max-w-md overflow-y-auto rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
            style={{
              height: "90vh",
              background: "linear-gradient(180deg, #0a0a0a 0%, #04231a 60%, #053024 100%)",
              borderTop: "1px solid rgba(212,175,55,0.35)",
              boxShadow: "0 -20px 60px -12px rgba(0,0,0,0.6)",
            }}
          >
            {/* Drag handle */}
            <div className="grid place-items-center pt-2 pb-1">
              <span className="block h-1.5 w-12 rounded-full bg-[#d4af37]/40" />
            </div>

            {/* Header */}
            <div className="relative px-5 pt-5 pb-4 border-b border-[#d4af37]/20">
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-white/10 text-[#f5d97a]"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <span
                  className="h-16 w-16 rounded-full overflow-hidden border-2 shrink-0"
                  style={{ borderColor: "#d4af37" }}
                >
                  <img
                    src={avatar}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarUser; }}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase tracking-[0.25em] text-[#d4af37]/80 inline-flex items-center gap-1">
                    {verified && <ShieldCheck className="h-3 w-3 text-emerald-400" />}
                    {verified ? "Verified Vendor" : (v?.status === "pending" ? "Pending Approval" : "Vendor")}
                  </p>
                  <h2 className="font-display text-lg font-bold text-[#fff8dc] truncate leading-tight">
                    {name}
                  </h2>
                  <p className="text-[11px] text-[#f5d97a]/80 truncate italic">{owner}</p>
                </div>
              </div>

              {/* KYC progress */}
              <Link
                to="/vendor/kyc"
                onClick={onClose}
                className="block mt-3 rounded-xl border border-[#d4af37]/30 bg-black/40 px-3 py-2.5"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-[#d4af37]" /> KYC Progress
                  </span>
                  <span className="text-[10px] font-bold text-[#fff8dc]">{kycPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-black/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${kycPct}%`, background: "linear-gradient(90deg,#f5d97a,#d4af37,#8b6508)" }}
                  />
                </div>
                <p className="text-[9px] text-[#d4af37]/60 mt-1.5">
                  {kycPct >= 100 ? "All details submitted" : "Tap to complete your KYC"}
                </p>
              </Link>
            </div>

            {/* Rows */}
            <nav className="px-3 py-3 space-y-1.5">
              {ROWS.map((r) => {
                const content = (
                  <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#d4af37]/10 active:scale-[0.98] transition">
                    <span
                      className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                      style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
                    >
                      <r.Icon className="h-4 w-4 text-[#1a1208]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-bold text-[#fff8dc] leading-tight">{r.label}</span>
                      <span className="block text-[10px] text-[#f5d97a]/60">{r.sub}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#d4af37]/60" />
                  </div>
                );
                return r.to ? (
                  <Link key={r.id} to={r.to} search={r.search as any} onClick={onClose}>{content}</Link>
                ) : (
                  <button key={r.id} className="w-full" onClick={onClose}>{content}</button>
                );
              })}
            </nav>

            {/* Footer actions */}
            <div className="px-4 py-4 border-t border-[#d4af37]/20 space-y-2.5">
              <Link
                to="/"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#d4af37]/40 text-[#f5d97a] text-[11px] font-bold uppercase tracking-widest hover:bg-[#d4af37]/10 transition"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Switch to Customer
              </Link>
              <button
                onClick={async () => {
                  const ok = window.confirm("Kya aap sach me logout karna chahte hain?");
                  if (!ok) return;
                  onClose();
                  try {
                    await signOut();
                    // Clear cached vendor flags so register page shows OTP screen fresh
                    if (typeof window !== "undefined") {
                      try {
                        Object.keys(sessionStorage).forEach((k) => {
                          if (k.startsWith("vendor:registered:")) sessionStorage.removeItem(k);
                        });
                      } catch {}
                    }
                    toast.success("Logged out");
                  } catch (e: any) {
                    toast.error(e?.message ?? "Logout failed");
                  } finally {
                    // Vendor logout → vendor OTP login screen (not customer home)
                    navigate({ to: "/vendor/register" });
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[#1a1208] text-[11px] font-bold uppercase tracking-widest"
                style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
              >
                <LogOut className="h-3.5 w-3.5" /> Logout
              </button>
              <p className="text-center text-[9px] uppercase tracking-[0.3em] text-[#d4af37]/40 pt-1">
                Karo Online · Vendor
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
