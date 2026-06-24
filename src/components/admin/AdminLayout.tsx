import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Crown,
  LayoutDashboard,
  Users,
  Store,
  FolderTree,
  Shield,
  CreditCard,
  MessageSquare,
  MessageCircle,
  Truck,
  Coins,
  FileText,
  Globe,
  Gift,
  Zap,
  Flame,
  Map as MapIcon,
  Bell,
  ShieldCheck,
  ClipboardList,
  Palette,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Loader2,
  QrCode,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ActionAlertBanner } from "@/components/ActionAlertBanner";
import { FloatingPhoneMockup } from "@/components/marketing/FloatingPhoneMockup";

type NavItem = { to: string; label: string; icon: typeof Crown };

const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/leads", label: "📡 All Leads (Control)", icon: ClipboardList },
  { to: "/admin/qr-assets", label: "🖨️ QR Management", icon: QrCode },
  { to: "/admin/lookup", label: "🔍 User Lookup (360)", icon: Users },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/vendors", label: "Vendors", icon: Store },
  { to: "/admin/catalog", label: "Catalog", icon: FolderTree },
  { to: "/admin/staff", label: "Staff & Roles", icon: Shield },
  { to: "/admin/payments", label: "Payment Gateways", icon: CreditCard },
  { to: "/admin/cashfree", label: "Cashfree Services", icon: Zap },
  { to: "/admin/kyc", label: "KYC Verification", icon: ShieldCheck },
  { to: "/admin/kyc-review", label: "🔍 KYC Submissions", icon: ClipboardList },
  { to: "/admin/sms", label: "SMS Gateways", icon: MessageSquare },
  { to: "/admin/whatsapp", label: "WhatsApp API", icon: MessageCircle },
  { to: "/admin/communication", label: "🎙️ Voice + Comm Hub", icon: MessageCircle },
  { to: "/admin/firebase", label: "Firebase Services", icon: Flame },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/maps", label: "Maps Providers", icon: MapIcon },
  { to: "/admin/system-status", label: "System Status", icon: Shield },
  { to: "/admin/devices", label: "🔓 Device Unlock", icon: Shield },
  { to: "/admin/test-accounts", label: "🧪 Test Accounts", icon: ShieldCheck },
  { to: "/admin/logistics", label: "Delivery Gateways", icon: Truck },
  { to: "/admin/coins", label: "LeadX Market", icon: Coins },
  { to: "/admin/referrals", label: "Referral Program", icon: Gift },
  { to: "/admin/forms", label: "Form Builder", icon: ClipboardList },
  { to: "/admin/branding", label: "Branding Studio", icon: Palette },
  { to: "/admin/legal", label: "Legal Pages", icon: FileText },
  { to: "/admin/web", label: "✨ Special Web (CMS)", icon: Globe },
  { to: "/admin/onboarding", label: "Onboarding Screens", icon: LayoutDashboard },
  { to: "/admin/settings", label: "App Settings", icon: SettingsIcon },
  { to: "/admin/feedback", label: "💬 Feedback / Support", icon: MessageSquare },
];

const GOLD_BG =
  "radial-gradient(circle at 20% 0%, oklch(0.22 0.04 80) 0%, oklch(0.10 0.02 80) 70%)";
const GOLD_GRAD =
  "linear-gradient(180deg, #fff8dc 0%, #f5d97a 35%, #d4af37 100%)";

export function AdminLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const isEmbed =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("embed") === "1";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) {
        navigate({ to: "/admin/login" });
        return;
      }
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const r = (roleRows ?? []).map((x) => x.role as string);
      const isAdmin = r.some((role) =>
        ["super_admin", "admin", "moderator", "support"].includes(role),
      );
      if (!isAdmin) {
        await supabase.auth.signOut();
        navigate({ to: "/admin/login" });
        return;
      }
      if (cancelled) return;
      setEmail(user.email ?? null);
      setRoles(r);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // close drawer on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  if (loading) {
    return (
      <div
        className="min-h-screen grid place-items-center"
        style={{ background: GOLD_BG }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  const topRole = roles.includes("super_admin")
    ? "SUPER ADMIN"
    : roles.includes("admin")
    ? "ADMIN"
    : roles.includes("moderator")
    ? "MODERATOR"
    : "SUPPORT";

  const Sidebar = (
    <aside
      className="h-full w-72 flex flex-col border-r"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.14 0.025 80) 0%, oklch(0.09 0.015 80) 100%)",
        borderColor: "rgba(212,175,55,0.25)",
      }}
    >
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-[#d4af37]/20">
        <div
          className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
          style={{
            background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
            boxShadow: "0 8px 24px -8px rgba(212,175,55,0.55)",
          }}
        >
          <Crown className="h-5 w-5 text-[#1a1208]" />
        </div>
        <div className="min-w-0">
          <h1
            className="font-display text-lg font-bold leading-tight truncate"
            style={{
              background: GOLD_GRAD,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Admin Panel
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/70 mt-0.5">
            {topRole}
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden ml-auto p-2 rounded-lg text-[#f5d97a] hover:bg-[#d4af37]/10"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const isActive =
            item.to === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition group ${
                isActive
                  ? "text-[#1a1208]"
                  : "text-[#f5d97a]/80 hover:text-[#fff8dc] hover:bg-[#d4af37]/10"
              }`}
              style={
                isActive
                  ? {
                      background: GOLD_GRAD,
                      boxShadow:
                        "0 8px 24px -10px rgba(212,175,55,0.6), inset 0 1px 0 rgba(255,255,255,0.4)",
                    }
                  : undefined
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / user */}
      <div className="px-4 py-4 border-t border-[#d4af37]/20 space-y-3">
        <Link
          to="/admin/profile"
          className="block rounded-xl px-3 py-2.5 border border-[#d4af37]/20 bg-black/30 hover:bg-[#d4af37]/10 transition"
        >
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#d4af37]/70 mb-0.5">
            Signed in as · Tap to manage
          </p>
          <p className="text-xs text-[#fff8dc] truncate font-medium">
            {email}
          </p>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#d4af37]/40 text-[#f5d97a] text-xs font-bold uppercase tracking-widest hover:bg-[#d4af37]/10 transition"
        >
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
        <Link
          to="/"
          className="block text-center text-[9px] uppercase tracking-[0.3em] text-[#d4af37]/50 hover:text-[#d4af37]"
        >
          ← Customer App
        </Link>
      </div>
    </aside>
  );

  return (
    <div
      className="min-h-screen flex"
      style={{ background: GOLD_BG }}
    >
      {/* Desktop sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen">{Sidebar}</div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full">{Sidebar}</div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b backdrop-blur-xl"
          style={{
            background: "rgba(15,12,5,0.85)",
            borderColor: "rgba(212,175,55,0.25)",
          }}
        >
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg text-[#f5d97a] hover:bg-[#d4af37]/10"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            to="/admin/profile"
            className="h-9 w-9 rounded-lg grid place-items-center"
            style={{
              background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
            }}
            aria-label="Profile"
          >
            <Crown className="h-4 w-4 text-[#1a1208]" />
          </Link>
          <h1
            className="font-display text-base font-bold"
            style={{
              background: GOLD_GRAD,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Admin Panel
          </h1>
          <Link
            to="/admin/profile"
            className="ml-auto text-[9px] uppercase tracking-[0.25em] text-[#d4af37]/80 font-bold px-2 py-1 rounded-full border border-[#d4af37]/30 hover:bg-[#d4af37]/10"
          >
            {topRole}
          </Link>
        </header>

        <ActionAlertBanner role="admin" />
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1400px] w-full mx-auto">
          {children ?? <Outlet />}
        </main>
      </div>
      {!isEmbed && <FloatingPhoneMockup />}
    </div>
  );
}

// Shared UI primitives for admin pages
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h2
          className="font-display text-2xl sm:text-3xl font-bold"
          style={{
            background:
              "linear-gradient(180deg, #fff8dc 0%, #d4af37 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[#f5d97a]/60 mt-1">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function GoldCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,253,245,0.06) 0%, rgba(255,253,245,0.02) 100%)",
        borderColor: "rgba(212,175,55,0.3)",
      }}
    >
      {children}
    </div>
  );
}

export function GoldButton({
  children,
  onClick,
  type = "button",
  disabled,
  variant = "primary",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "primary" | "outline" | "danger";
  size?: "sm" | "md";
  className?: string;
}) {
  const sz = size === "sm" ? "px-3 py-1.5 text-[11px]" : "px-4 py-2.5 text-xs";
  if (variant === "primary") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${sz} rounded-xl font-bold uppercase tracking-widest text-[#1a1208] disabled:opacity-50 active:scale-[0.98] transition ${className}`}
        style={{
          background: GOLD_GRAD,
          boxShadow: "0 8px 24px -10px rgba(212,175,55,0.6)",
        }}
      >
        {children}
      </button>
    );
  }
  if (variant === "danger") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${sz} rounded-xl font-bold uppercase tracking-widest border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50 transition ${className}`}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${sz} rounded-xl font-bold uppercase tracking-widest border border-[#d4af37]/40 text-[#f5d97a] hover:bg-[#d4af37]/10 disabled:opacity-50 transition ${className}`}
    >
      {children}
    </button>
  );
}
