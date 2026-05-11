import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { X, MapPin, Wrench, Clock, User, Bell, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { toast } from "sonner";

type Tone = "amber" | "blue" | "slate";
type Alert = {
  key: string;
  tone: Tone;
  icon: React.ReactNode;
  text: string;
  cta?: string;
  to?: string;
  onClick?: () => void;
};

function Banner({ a, onDismiss }: { a: Alert; onDismiss: () => void }) {
  const tones: Record<Tone, string> = {
    amber:
      "from-amber-100/95 via-amber-50/95 to-amber-100/95 border-amber-300/70 text-amber-900",
    blue: "from-sky-100/95 via-sky-50/95 to-sky-100/95 border-sky-300/70 text-sky-900",
    slate:
      "from-slate-100/95 via-white/95 to-slate-100/95 border-slate-300/70 text-slate-700",
  };
  const Inner = (
    <div className="flex items-center gap-2 px-3 py-1.5 min-w-0 flex-1">
      <span className="shrink-0 opacity-90">{a.icon}</span>
      <span className="text-[11px] font-semibold leading-tight truncate flex-1">
        {a.text}
      </span>
      {a.cta && (
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 border border-current/30">
          {a.cta}
        </span>
      )}
    </div>
  );
  return (
    <div
      className={`flex items-stretch pointer-events-auto backdrop-blur-md bg-gradient-to-r ${tones[a.tone]} border-b shadow-sm`}
    >
      {a.to ? (
        <Link to={a.to} className="flex-1 min-w-0 flex active:opacity-80 cursor-pointer">
          {Inner}
        </Link>
      ) : a.onClick ? (
        <button type="button" onClick={a.onClick} className="flex-1 min-w-0 flex text-left active:opacity-80 cursor-pointer">
          {Inner}
        </button>
      ) : (
        <div className="flex-1 min-w-0 flex">{Inner}</div>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="px-2 grid place-items-center hover:bg-black/5 active:scale-90"
      >
        <X className="h-3.5 w-3.5 opacity-70" />
      </button>
    </div>
  );
}

const DISMISS_KEY = "ko-alert-dismissed-v1";
function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function writeDismissed(s: Set<string>) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(s)));
  } catch {}
}

export function ActionAlertBanner({ role }: { role: "admin" | "vendor" | "customer" }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const geo = useGeolocation();
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [gpsReady, setGpsReady] = useState(false);
  const [adminCounts, setAdminCounts] = useState<{ pendingVendors: number; pendingKyc: number }>({
    pendingVendors: 0,
    pendingKyc: 0,
  });
  const [vendorRow, setVendorRow] = useState<{
    status?: string | null;
    lat?: number | null;
    lng?: number | null;
    mappings?: number;
  } | null>(null);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  // Admin data
  useEffect(() => {
    if (role !== "admin") return;
    let cancelled = false;
    const load = async () => {
      const [pendingV, unverified] = await Promise.all([
        supabase.from("vendors").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("vendors").select("id", { count: "exact", head: true }).eq("verified", false),
      ]);
      if (cancelled) return;
      setAdminCounts({
        pendingVendors: pendingV.count ?? 0,
        pendingKyc: unverified.count ?? 0,
      });
    };
    load();
    const ch = supabase
      .channel("admin-alert-banner")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendors" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [role]);

  // Vendor data
  useEffect(() => {
    if (role !== "vendor" || !user) return;
    let cancelled = false;
    const load = async () => {
      const [v, m] = await Promise.all([
        supabase
          .from("vendors")
          .select("status, lat, lng")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("vendor_item_mappings")
          .select("id", { count: "exact", head: true })
          .eq("vendor_id", user.id)
          .eq("is_active", true),
      ]);
      if (cancelled) return;
      setVendorRow({
        status: (v.data as any)?.status,
        lat: (v.data as any)?.lat,
        lng: (v.data as any)?.lng,
        mappings: m.count ?? 0,
      });
    };
    load();
    const ch = supabase
      .channel(`vendor-alert-banner-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendors", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendor_item_mappings", filter: `vendor_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [role, user]);

  const setLocationNow = async () => {
    if (!user || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await supabase
          .from("vendors")
          .update({ lat: latitude, lng: longitude })
          .eq("user_id", user.id);
        setVendorRow((p) => (p ? { ...p, lat: latitude, lng: longitude } : p));
      },
      () => {
        navigate({ to: "/vendor/register" });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const openProfileUpdate = () => {
    try {
      sessionStorage.setItem("ko-open-profile-edit", "1");
    } catch {}
    navigate({ to: "/profile" });
  };

  const requestGps = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location not supported on this device");
      return;
    }
    // Check if already permanently denied → guide user to settings
    try {
      const p = await navigator.permissions?.query?.({ name: "geolocation" as PermissionName });
      if (p?.state === "denied") {
        toast.error("Location blocked. Open browser settings → Site settings → Location → Allow.", { duration: 6000 });
        return;
      }
    } catch { /* */ }
    toast.loading("Detecting location…", { id: "gps" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          localStorage.setItem(
            "ko-geo-cache",
            JSON.stringify({ lat: latitude, lng: longitude, label: "Locating address…", ts: Date.now() }),
          );
          window.dispatchEvent(new Event("ko-geo-refresh"));
        } catch {}
        setGpsReady(true);
        toast.success("Location enabled ✓", { id: "gps" });
      },
      (err) => {
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Permission denied. Allow location in browser settings."
            : "Couldn't detect location. Please try again.",
          { id: "gps", duration: 5000 },
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    if (role === "admin") {
      if (adminCounts.pendingVendors > 0)
        out.push({
          key: "admin-vendor-pending",
          tone: "amber",
          icon: <Bell className="h-3.5 w-3.5" />,
          text: `🔔 ${adminCounts.pendingVendors} New Vendor${adminCounts.pendingVendors > 1 ? "s" : ""} waiting for approval.`,
          cta: "Approve Now",
          to: "/admin/vendors",
        });
      if (adminCounts.pendingKyc > 0)
        out.push({
          key: "admin-kyc",
          tone: "blue",
          icon: <FileCheck className="h-3.5 w-3.5" />,
          text: `📄 ${adminCounts.pendingKyc} KYC document${adminCounts.pendingKyc > 1 ? "s" : ""} need verification.`,
          cta: "Review Now",
          to: "/admin/vendors",
        });
    }
    if (role === "vendor" && vendorRow) {
      if (vendorRow.status === "pending")
        out.push({
          key: "v-pending",
          tone: "slate",
          icon: <Clock className="h-3.5 w-3.5" />,
          text: "⏳ Account Pending. Admin will approve you shortly.",
        });
      if (vendorRow.lat == null || vendorRow.lng == null)
        out.push({
          key: "v-loc",
          tone: "amber",
          icon: <MapPin className="h-3.5 w-3.5" />,
          text: "📍 Location not set! You cannot receive leads.",
          cta: "Set Now",
          onClick: setLocationNow,
        });
      if ((vendorRow.mappings ?? 0) === 0)
        out.push({
          key: "v-services",
          tone: "blue",
          icon: <Wrench className="h-3.5 w-3.5" />,
          text: "🛠️ No services selected. Map your expertise to get leads.",
          cta: "Select",
          to: "/vendor/services",
        });
    }
    if (role === "customer") {
      const incomplete = !profile?.name || !profile?.email;
      if (user && incomplete)
        out.push({
          key: "c-profile",
          tone: "blue",
          icon: <User className="h-3.5 w-3.5" />,
          text: "👤 Name/Email complete करें ताकि request details सही रहें.",
          cta: "Update",
          onClick: openProfileUpdate,
        });
      if (!gpsReady && (geo.status === "denied" || geo.status === "idle" || geo.status === "error" || geo.status === "unsupported"))
        out.push({
          key: "c-gps",
          tone: "amber",
          icon: <MapPin className="h-3.5 w-3.5" />,
          text: "📍 Enable GPS to find experts near you.",
          cta: "Allow",
          onClick: requestGps,
        });
    }
    return out.filter((a) => !dismissed.has(a.key));
  }, [role, adminCounts, vendorRow, profile, user, geo, gpsReady, dismissed]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[120] w-full pointer-events-none">
      {alerts.map((a) => (
        <Banner
          key={a.key}
          a={a}
          onDismiss={() => {
            const next = new Set(dismissed);
            next.add(a.key);
            setDismissed(next);
            writeDismissed(next);
          }}
        />
      ))}
    </div>
  );
}
