import { useEffect, useState } from "react";
import { MapPin, Bell, Check, X, Loader2, ShieldCheck, Settings, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

function detectBrowser(): "chrome" | "firefox" | "safari" | "edge" | "samsung" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("samsungbrowser")) return "samsung";
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("chrome")) return "chrome";
  if (ua.includes("safari")) return "safari";
  return "other";
}

function settingsHint(): string {
  switch (detectBrowser()) {
    case "chrome":
    case "edge":
      return "Address bar के 🔒 lock icon पर tap करें → Permissions → Location → Allow";
    case "samsung":
      return "Address bar के 🔒 icon पर tap करें → Permissions → Location → Allow";
    case "firefox":
      return "Address bar के shield/lock icon → More information → Permissions → Access your location → Allow";
    case "safari":
      return "Settings app → Safari → Location → Allow, फिर page reload करें";
    default:
      return "Browser के address bar के lock icon से location को Allow करें";
  }
}

const ACK_KEY = "ko-permissions-ack-v1";

type PermStatus = "idle" | "asking" | "granted" | "denied";

/**
 * Shown once after the user signs in. Asks for the OS-level permissions the
 * app needs (location for nearby vendors, notifications for lead alerts) in
 * an explainer first → then triggers the native prompt. Persists ack in
 * localStorage so it never re-appears for the same user on the same device.
 */
export function PermissionsGate() {
  const { isAuthenticated, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const [loc, setLoc] = useState<PermStatus>("idle");
  const [notif, setNotif] = useState<PermStatus>("idle");

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(ACK_KEY) === "1") return;

    // Pre-read current permission states so we don't ask again if already granted
    (async () => {
      let locOk = false;
      let notifOk = false;
      try {
        const p = await navigator.permissions?.query?.({ name: "geolocation" as PermissionName });
        if (p?.state === "granted") { setLoc("granted"); locOk = true; }
        else if (p?.state === "denied") setLoc("denied");
      } catch { /* */ }
      if ("Notification" in window) {
        if (Notification.permission === "granted") { setNotif("granted"); notifOk = true; }
        else if (Notification.permission === "denied") setNotif("denied");
      } else {
        notifOk = true; // not supported — skip
      }
      if (locOk && notifOk) {
        localStorage.setItem(ACK_KEY, "1");
        return;
      }
      setOpen(true);
    })();
  }, [ready, isAuthenticated]);

  const askLocation = () => {
    if (!("geolocation" in navigator)) {
      setLoc("denied");
      toast.error("Location not supported on this device", { id: "perm-loc" });
      return;
    }
    // If already permanently denied, don't fire prompt — show inline help instead
    (async () => {
      try {
        const p = await navigator.permissions?.query?.({ name: "geolocation" as PermissionName });
        if (p?.state === "denied") {
          setLoc("denied");
          return;
        }
      } catch { /* */ }
      setLoc("asking");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            localStorage.setItem(
                "ko-geo-cache-v2",
              JSON.stringify({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                label: "Locating address…",
                ts: Date.now(),
              }),
            );
            window.dispatchEvent(new Event("ko-geo-refresh"));
          } catch { /* */ }
          setLoc("granted");
          toast.success("Location enabled ✓", { id: "perm-loc" });
        },
        () => {
          setLoc("denied");
          // No toast — inline help row already shows the steps
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    })();
  };

  const askNotifications = async () => {
    if (!("Notification" in window)) { setNotif("granted"); return; }
    if (Notification.permission === "denied") { setNotif("denied"); return; }
    setNotif("asking");
    try {
      const r = await Notification.requestPermission();
      if (r === "granted") { setNotif("granted"); toast.success("Notifications on ✓", { id: "perm-notif" }); }
      else { setNotif("denied"); }
    } catch {
      setNotif("denied");
    }
  };

  const finish = () => {
    localStorage.setItem(ACK_KEY, "1");
    setOpen(false);
  };

  const reloadPage = () => {
    localStorage.setItem(ACK_KEY, "1");
    window.location.reload();
  };

  if (!open) return null;

  // Mandatory: must be granted to continue (notifications optional on unsupported devices)
  const locOk = loc === "granted";
  const notifOk = notif === "granted" || !("Notification" in window);
  const allGranted = locOk && notifOk;
  const anyDenied = loc === "denied" || notif === "denied";

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-5 pt-6 pb-4 bg-gradient-to-br from-amber-50 via-white to-amber-50 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-3 text-lg font-bold text-slate-900">Quick setup</h2>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Aage badhne ke liye 2 permissions zaroori hain. Allow karein —
            yeh sirf ek baar puchhega.
          </p>
        </div>

        <div className="p-4 space-y-3">
          <PermRow
            icon={<MapPin className="h-5 w-5" />}
            title="Location access"
            desc="Aas-paas ke vendors aur exact address dikhane ke liye."
            status={loc}
            onAsk={askLocation}
          />
          <PermRow
            icon={<Bell className="h-5 w-5" />}
            title="Notifications"
            desc="Lead, order updates aur chat alerts ke liye."
            status={notif}
            onAsk={askNotifications}
          />

          {anyDenied && !allGranted && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Settings className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-amber-900">
                    Browser ne block kar diya hai
                  </p>
                  <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                    {settingsHint()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={reloadPage}
                className="w-full py-2 rounded-xl bg-amber-600 text-white text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Setting badalne ke baad — Reload
              </button>
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={finish}
            disabled={!allGranted}
            className="w-full py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-amber-500/30"
          >
            {allGranted ? "Continue →" : "Allow karke aage badhein"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PermRow({
  icon, title, desc, status, onAsk,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  status: PermStatus;
  onAsk: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
      <div className="h-10 w-10 rounded-xl grid place-items-center bg-white text-amber-600 shadow-sm shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
      </div>
      {status === "granted" ? (
        <span className="h-8 px-2 rounded-full grid place-items-center bg-emerald-100 text-emerald-700 text-[10px] font-bold">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : status === "denied" ? (
        <button
          type="button"
          onClick={onAsk}
          className="h-8 px-3 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Retry
        </button>
      ) : status === "asking" ? (
        <span className="h-8 w-8 rounded-full grid place-items-center bg-slate-200">
          <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
        </span>
      ) : (
        <button
          type="button"
          onClick={onAsk}
          className="h-8 px-3 rounded-full bg-amber-500 text-white text-[10px] font-bold active:scale-95"
        >
          Allow
        </button>
      )}
    </div>
  );
}
