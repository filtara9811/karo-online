import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { VendorSideMenu } from "@/components/VendorSideMenu";
import {
  Download,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MessageCircle,
  Phone,
  Store,
  Zap,
  ChevronRight,
  Bell,
  Plus,
  Sparkles,
  ArrowLeft,
  Wallet as WalletIcon,
} from "lucide-react";
import avatarUser from "@/assets/avatar-user.png";
import type { Lead, LeadSource, LeadStatus } from "@/lib/leads";
import { VendorNotificationBell } from "@/components/VendorNotificationBell";
import { ActionAlertBanner } from "@/components/ActionAlertBanner";
import { VendorAuthGate } from "@/components/VendorAuthGate";
import { LeadPricingStrip } from "@/components/LeadPricingStrip";
import { VendorPendingLeadsSheet, usePendingLeadsCount } from "@/components/VendorPendingLeadsSheet";
import { VendorLeadDetailSheet } from "@/components/VendorLeadDetailSheet";
import { useLeadUnreadCounts } from "@/hooks/use-lead-unread";


export const Route = createFileRoute("/vendor/dashboard")({
  head: () => ({
    meta: [
      { title: "Vendor Dashboard — Karo Online" },
      { name: "description", content: "Manage your leads, products and digital shop." },
    ],
  }),
  component: () => (<VendorAuthGate><VendorDashboard /></VendorAuthGate>),
});

type Potential = { id: string; title: string; earn: number; customers: number; chance: string };

type CustomerLookup = {
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  address: string | null;
};

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function distanceKm(a?: { lat?: number | null; lng?: number | null } | null, b?: { lat?: number | null; lng?: number | null } | null) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

function VendorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"my" | "potential">("my");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leadsSheetOpen, setLeadsSheetOpen] = useState(false);
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const pendingCount = usePendingLeadsCount();
  const [vendor, setVendor] = useState<{ business_name?: string | null; owner_name?: string | null; avatar_url?: string | null; status?: string | null; verified?: boolean | null; auto_accept_leads?: boolean | null; lat?: number | null; lng?: number | null } | null>(null);
  const [savingAuto, setSavingAuto] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("vendors")
      .select("business_name, owner_name, avatar_url, status, verified, auto_accept_leads, lat, lng")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setVendor(data as any));
  }, [user]);

  // Load REAL leads for this vendor: only the ones the vendor has STARTED WORK on.
  // (Auto-accept sets vendor_started_at = now() in accept_lead; manual must press "Start Work")
  useEffect(() => {
    if (!user) { setLoadingLeads(false); return; }
    let cancelled = false;
    const load = async () => {
      const { data: notifs } = await supabase
        .from("lead_notifications")
        .select("lead_id, status, created_at, vendor_started_at")
        .eq("vendor_id", user.id)
        .not("vendor_started_at", "is", null)
        .order("vendor_started_at", { ascending: false })
        .limit(50);
      const ids = Array.from(new Set((notifs ?? []).map((n: any) => n.lead_id)));
      if (ids.length === 0) { if (!cancelled) { setLeads([]); setLoadingLeads(false); } return; }
      const { data: rows } = await supabase
        .from("leads")
        .select("id, customer_id, customer_name, customer_phone, sub_category_id, sub_category_name, address, note, lead_price_inr, source, status, accepted_vendor_ids, created_at, lat, lng")
        .in("id", ids);
      if (cancelled) return;
      const customerIds = Array.from(new Set((rows ?? []).map((r: any) => r.customer_id).filter(Boolean)));
      const customerMap = new Map<string, CustomerLookup>();
      if (customerIds.length) {
        const { data: customers } = await supabase
          .from("customers")
          .select("user_id, name, phone, avatar_url, address")
          .in("user_id", customerIds);
        (customers ?? []).forEach((c: any) => customerMap.set(c.user_id, c));
      }
      const subIds = Array.from(new Set((rows ?? []).map((r: any) => r.sub_category_id).filter(Boolean)));
      const subImageMap = new Map<string, string | null>();
      if (subIds.length) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id, image_url")
          .in("id", subIds);
        (cats ?? []).forEach((c: any) => subImageMap.set(c.id, c.image_url ?? null));
      }
      const notifStatusMap = new Map((notifs ?? []).map((n: any) => [n.lead_id, n.status]));
      const mapped: Lead[] = (rows ?? []).map((r: any) => {
        const customer = customerMap.get(r.customer_id);
        const accepted = (r.accepted_vendor_ids ?? []).includes(user.id);
        const nstatus = notifStatusMap.get(r.id);
        let st: LeadStatus = "process";
        if (r.status === "completed" && accepted) st = "success";
        else if (accepted) st = "process";
        else if (nstatus === "rejected") st = "rejected";
        const src: LeadSource = (["whatsapp","call","digital","quick"].includes(r.source) ? r.source : "quick") as LeadSource;
        return {
          id: r.id,
          leadCode: String(r.id).slice(0, 5).toUpperCase(),
          name: customer?.name || r.customer_name || "Customer",
          phone: customer?.phone || r.customer_phone || "",
          avatarUrl: customer?.avatar_url ?? null,
          productImage: subImageMap.get(r.sub_category_id) ?? null,
          distanceKm: distanceKm(vendor, { lat: r.lat, lng: r.lng }),
          address: r.address || customer?.address || undefined,
          service: r.sub_category_name ?? "Service",
          amount: Number(r.lead_price_inr ?? 0),
          rating: 4.9,
          source: src,
          status: st,
          time: timeAgo(r.created_at),
          createdAtIso: r.created_at,
          progressPct: st === "success" ? 100 : 55,
          note: r.note ?? "",
          timeline: [{ at: timeAgo(r.created_at), label: "Lead received", kind: "created" as const }],
        };
      });

      setLeads(mapped);
      setLoadingLeads(false);
    };
    load();
    const channel = supabase
      .channel(`vendor-leads-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_notifications", filter: `vendor_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user, vendor]);


  const toggleAutoAccept = async () => {
    if (!user || savingAuto) return;
    const next = !vendor?.auto_accept_leads;
    setSavingAuto(true);
    setVendor((p) => (p ? { ...p, auto_accept_leads: next } : p));
    const { error } = await supabase
      .from("vendors")
      .update({ auto_accept_leads: next })
      .eq("user_id", user.id);
    setSavingAuto(false);
    if (error) {
      setVendor((p) => (p ? { ...p, auto_accept_leads: !next } : p));
      toast.error("Setting save nahi hua");
    } else {
      toast.success(next ? "Auto Accept ON — har lead automatic accept hogi" : "Manual Accept ON — har lead aapko accept karni hogi");
    }
  };

  const stats = useMemo(() => {
    const total = leads.length;
    const success = leads.filter((l) => l.status === "success").length;
    const process = leads.filter((l) => l.status === "process").length;
    const rejected = leads.filter((l) => l.status === "rejected").length;
    const action = leads.filter((l) => l.status === "new").length;
    return { total, success, process, rejected, action };
  }, [leads]);

  const acceptLead = async (id: string) => {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      const { data, error } = await supabase.rpc("accept_lead", { _lead_id: id });
      const res = data as any;
      if (error || !res?.ok) {
        toast.error(res?.reason === "insufficient_coins" ? "LeadX coins low hain — wallet recharge karein" : "Lead accept nahi ho paayi");
        return;
      }
      toast.success("Lead accept ho gayi — customer ko profile dikh rahi hai");
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "process" } : l)));
  };

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden pb-32 isolate"
      style={{
        background:
          "radial-gradient(ellipse at top, #f5f6f8 0%, transparent 55%), linear-gradient(160deg, #f5f6f8 0%, #f5f6f8 60%, #eef0f3 100%)",
      }}
    >
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.18),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.94_0.08_92/0.25),transparent_70%)] blur-2xl" />

      <ActionAlertBanner role="vendor" />
      {/* Top bar — avatar (opens menu) at left, status banner if pending */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[color:oklch(0.72_0.01_260/0.35)]">
        <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-between gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="relative h-11 w-11 rounded-full overflow-hidden border-2 shadow-md active:scale-95 shrink-0"
            style={{ borderColor: "#d4af37" }}
          >
            <img src={vendor?.avatar_url || avatarUser} alt="" className="h-full w-full object-cover" />
            {vendor?.verified && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
            )}
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">✦ Vendor Panel ✦</p>
            <h1 className="font-display text-base text-silver-gradient leading-tight font-bold truncate">
              {vendor?.business_name || "My Dashboard"}
            </h1>
          </div>
          <VendorNotificationBell />
        </div>
        {vendor?.status === "pending" && (
          <div className="bg-amber-100 border-t border-amber-300 px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-amber-800">
            ⏳ Pending Admin Approval
          </div>
        )}
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4 relative">
        {/* Compact action chip — Services + Wallet (avatar moved to top) */}
        <section
          className="relative rounded-2xl overflow-hidden px-3 py-2 flex items-center gap-2 shadow-silver-glow"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f5f6f8 60%, #eef0f3 100%)",
            border: "1px solid rgba(212,175,55,0.5)",
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)]">
              {vendor?.verified ? "Verified · ID K-91824" : "Vendor Profile"}
            </p>
            <p className="text-[11px] text-[color:oklch(0.45_0.01_260)] italic truncate">
              {vendor?.owner_name || "Quick Service · Beauty"}
            </p>
          </div>
          <Link
            to="/vendor/services"
            className="h-9 px-3 grid place-items-center rounded-full shadow-md active:scale-95 text-[10px] font-display font-bold text-[#1a1208] uppercase tracking-wider"
            style={{ background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3)" }}
          >
            Services
          </Link>
          <Link
            to="/vendor/wallet"
            aria-label="Wallet"
            className="h-9 w-9 grid place-items-center rounded-full shadow-md active:scale-90"
            style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
          >
            <WalletIcon className="h-4 w-4 text-[#1a1208]" />
          </Link>
        </section>

        {/* Live lead pricing & wallet balance — surfaced on home */}
        <LeadPricingStrip />

        {/* Auto / Manual accept toggle */}
        <button
          onClick={toggleAutoAccept}
          className="w-full rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.45)] p-3 flex items-center gap-3 shadow-sm active:scale-[0.99] text-left"
        >
          <span className={`h-10 w-10 rounded-full grid place-items-center ${vendor?.auto_accept_leads ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            <Zap className="h-5 w-5" fill={vendor?.auto_accept_leads ? "currentColor" : "none"} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[color:oklch(0.55_0.10_82)] font-bold">Lead Acceptance</p>
            <p className="text-sm font-display font-bold text-slate-800 leading-tight">
              {vendor?.auto_accept_leads ? "Auto Accept · ON" : "Manual Accept"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
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

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl border border-[color:oklch(0.72_0.01_260/0.4)] p-1 shadow-sm">
          <button
            onClick={() => setTab("my")}
            className={`flex-1 py-2 text-sm font-display font-bold rounded-xl transition-all ${
              tab === "my"
                ? "text-[color:oklch(0.20_0.01_260)] shadow-md"
                : "text-[color:oklch(0.55_0.10_82)]"
            }`}
            style={
              tab === "my"
                ? { background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 60%, #a8acb3 100%)" }
                : undefined
            }
          >
            My Leads
          </button>
          <button
            onClick={() => setTab("potential")}
            className={`flex-1 py-2 text-sm font-display font-bold rounded-xl transition-all ${
              tab === "potential"
                ? "text-[color:oklch(0.20_0.01_260)] shadow-md"
                : "text-[color:oklch(0.55_0.10_82)]"
            }`}
            style={
              tab === "potential"
                ? { background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 60%, #a8acb3 100%)" }
                : undefined
            }
          >
            Potential Leads
          </button>
        </div>

        {tab === "my" ? (
          <>
            {/* Hero stats card — visiting card style */}
            <section
              onClick={() => setLeadsSheetOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLeadsSheetOpen(true); }}
              className="relative rounded-3xl overflow-hidden p-4 text-[color:oklch(0.20_0.01_260)] shadow-[0_12px_30px_-10px_rgba(212,175,55,0.55)] cursor-pointer active:scale-[0.99] transition"
              style={{
                background:
                  "linear-gradient(135deg, #f5f6f8 0%, #d8dde3 35%, #a8acb3 80%, #6b7280 100%)",
                border: "1.5px solid rgba(255,255,255,0.6)",
              }}
            >
              {/* Diamond pattern overlay */}
              <div
                className="absolute inset-0 opacity-25 pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0 1px, transparent 1px 18px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.4) 0 1px, transparent 1px 18px)",
                }}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] opacity-80">Total Added Leads</p>
                  <p className="text-xs italic opacity-75">Tap to view all leads</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-12 w-14 rounded-2xl bg-white text-[color:oklch(0.20_0.01_260)] grid place-items-center font-display text-2xl font-bold shadow">
                    {stats.total}
                  </span>
                  <button
                    aria-label="Download"
                    onClick={(e) => { e.stopPropagation(); /* TODO: CSV export */ }}
                    className="h-12 w-12 rounded-2xl bg-white grid place-items-center text-[color:oklch(0.42_0.01_260)] shadow active:scale-90"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="relative my-3 border-t border-dashed border-white/70" />

              <div className="relative grid grid-cols-4 gap-1 text-center">
                <StatCell value={stats.success} label="Success" />
                <StatCell value={stats.process} label="In Process" />
                <StatCell value={stats.rejected} label="Rejected" />
                <StatCell value={stats.action} label="Action Req." active />
              </div>
            </section>

            {/* Lead cards */}
            <div className="space-y-3">
              {loadingLeads && (
                <div className="text-center py-10 text-xs text-[color:oklch(0.45_0.01_260)]">Leads load ho rahi hain…</div>
              )}
              {!loadingLeads && leads.length === 0 && (
                <div className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-6 text-center shadow-sm">
                  <Bell className="h-8 w-8 mx-auto text-[color:oklch(0.55_0.10_82)] opacity-60" />
                  <p className="mt-2 font-display font-bold text-sm text-[color:oklch(0.25_0.01_260)]">Abhi koi lead nahi</p>
                  <p className="text-[11px] text-[color:oklch(0.45_0.01_260)] mt-1">Naya customer request karte hi yahan pop-up aayega.</p>
                </div>
              )}
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  unread={unreadByLead[lead.id] ?? 0}
                  onOpen={() => setDetailLeadId(lead.id)}
                />
              ))}
            </div>
          </>
        ) : (

          <div className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-6 text-center shadow-sm">
            <Sparkles className="h-8 w-8 mx-auto text-[color:oklch(0.55_0.10_82)] opacity-70" />
            <p className="mt-2 font-display font-bold text-sm text-[color:oklch(0.25_0.01_260)]">Potential Leads coming soon</p>
            <p className="text-[11px] text-[color:oklch(0.45_0.01_260)] mt-1">Aapke area ke high-value leads yahan dikhenge.</p>
          </div>
        )}
      </div>

      {/* Floating action: open digital shop */}
      <Link
        to="/vendor/shop"
        aria-label="Open Digital Shop"
        className="btn-3d fixed bottom-24 right-5 z-40 h-14 w-14 grid place-items-center rounded-full text-[color:oklch(0.20_0.01_260)] shadow-[0_10px_28px_-6px_rgba(212,175,55,0.7)] active:scale-90"
        style={{
          background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 35%, #a8acb3 75%, #3f4750 100%)",
          border: "2px solid rgba(255,255,255,0.7)",
          animation: "breathe 2.6s ease-in-out infinite",
        }}
      >
        <Store className="h-6 w-6" strokeWidth={2.4} />
      </Link>

      {/* Bottom dock — quick actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto px-6 pb-3">
          <div
            className="flex items-center justify-around rounded-3xl bg-white/95 border border-[color:oklch(0.72_0.01_260/0.55)] shadow-[0_-8px_32px_-8px_rgba(212,175,55,0.35)] px-2 py-2"
          >
            <DockItem
              label="Leads"
              icon={<TrendingUp className="h-4 w-4" />}
              active
              badge={pendingCount}
              onClick={() => setLeadsSheetOpen(true)}
            />
            <Link
              to="/vendor/shop"
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl"
            >
              <span
                className="h-9 w-9 rounded-full grid place-items-center text-[color:oklch(0.20_0.01_260)] shadow-md"
                style={{ background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3)" }}
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className="text-[9px] font-bold text-[color:oklch(0.42_0.01_260)]">Shop</span>
            </Link>
            <Link
              to="/profile"
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <span className="h-8 w-8 rounded-full grid place-items-center text-[color:oklch(0.45_0.01_260)]">
                <Store className="h-4 w-4" />
              </span>
              <span className="text-[9px] font-bold text-[color:oklch(0.45_0.01_260)]">
                Profile
              </span>
            </Link>
          </div>
        </div>
      </div>
      <VendorSideMenu open={menuOpen} onClose={() => setMenuOpen(false)} vendor={vendor} />
      <VendorPendingLeadsSheet open={leadsSheetOpen} onClose={() => setLeadsSheetOpen(false)} />
      <VendorLeadDetailSheet
        open={!!detailLeadId}
        lead={leads.find((l) => l.id === detailLeadId) ?? null}
        otherLeads={leads}
        onClose={() => setDetailLeadId(null)}
        onSwitchLead={(id) => setDetailLeadId(id)}
      />
    </div>
  );
}

function StatCell({ value, label, active }: { value: number; label: string; active?: boolean }) {
  return (
    <div className="px-1">
      <p className={`font-display font-bold text-xl leading-none ${active ? "text-[#8b1a1a]" : "text-[color:oklch(0.20_0.01_260)]"}`}>
        {value}
      </p>
      <p className="text-[8px] uppercase tracking-[0.18em] mt-1 opacity-90">{label}</p>
      {active && <span className="block mx-auto mt-1 h-0.5 w-6 rounded-full bg-[color:oklch(0.20_0.01_260)]" />}
    </div>
  );
}

const SOURCE_META: Record<LeadSource, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  whatsapp: { label: "WhatsApp", icon: <MessageCircle className="h-2.5 w-2.5" />, bg: "linear-gradient(135deg, #f5f6f8, #eef0f3)", text: "oklch(0.42 0.01 260)" },
  call:     { label: "Calling",  icon: <Phone className="h-2.5 w-2.5" />,         bg: "linear-gradient(135deg, #f5f6f8, #d8dde3)", text: "oklch(0.30 0.05 85)" },
  digital:  { label: "Digital Dukan", icon: <Store className="h-2.5 w-2.5" />,    bg: "linear-gradient(135deg, #eef0f3, #a8acb3)", text: "oklch(0.20 0.01 260)" },
  quick:    { label: "Quick Service", icon: <Zap className="h-2.5 w-2.5" />,      bg: "linear-gradient(135deg, #f5f6f8, #d8dde3)", text: "oklch(0.30 0.05 85)" },
};

const STATUS_META: Record<LeadStatus, { label: string; icon: React.ReactNode; tint: string }> = {
  new:      { label: "Action Required", icon: <AlertCircle className="h-3 w-3" />, tint: "bg-[#eef0f3] text-[#3f4750]" },
  process:  { label: "In Process",      icon: <Clock className="h-3 w-3" />,       tint: "bg-[#f5f6f8] text-[color:oklch(0.42_0.01_260)]" },
  success:  { label: "Payout Released", icon: <CheckCircle2 className="h-3 w-3" />, tint: "bg-[#f0fdf4] text-[#15803d]" },
  rejected: { label: "Rejected",        icon: <XCircle className="h-3 w-3" />,     tint: "bg-[#fef2f2] text-[#b91c1c]" },
};

function formatLiveDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mon = d.toLocaleString("en-IN", { month: "short" }).toLowerCase();
  const day = d.getDate();
  const yr = d.getFullYear();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${day} ${mon} ${yr}  ${h}:${m} ${ap}`;
}

function ProgressRing({ pct, status }: { pct: number; status: LeadStatus }) {
  const r = 16, c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  const color =
    status === "success" ? "#15803d" :
    status === "rejected" ? "#b91c1c" :
    status === "process" ? "#15803d" : "#d4af37";
  return (
    <div className="relative h-10 w-10 flex-shrink-0">
      <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
        <circle cx="20" cy="20" r={r} stroke="#e5e7eb" strokeWidth="3" fill="none" />
        <circle cx="20" cy="20" r={r} stroke={color} strokeWidth="3" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[8px] font-bold text-slate-700">{pct}%</span>
    </div>
  );
}

function LeadCard({ lead, onAccept, onOpen }: { lead: Lead; onAccept: () => void; onOpen: () => void }) {
  const st = STATUS_META[lead.status];
  const avatar = lead.avatarUrl;
  const initial = lead.name.charAt(0).toUpperCase();
  const isLocked = lead.status === "new";
  const pct = lead.progressPct ?? 25;

  const statusPillCls =
    lead.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
    lead.status === "process" ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
    lead.status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-300" :
    "bg-amber-50 text-amber-800 border-amber-300";

  return (
    <article
      className="rounded-3xl bg-white overflow-hidden shadow-[0_6px_18px_-8px_rgba(15,23,42,0.18)]"
      style={{ border: "1px solid rgba(212,175,55,0.35)" }}
    >
      <button
        type="button"
        onClick={() => { if (!isLocked) onOpen(); }}
        aria-disabled={isLocked}
        className={`block w-full text-left ${isLocked ? "cursor-not-allowed select-none" : "active:scale-[0.99] transition"}`}
      >
        {/* ===== HEAD ROW: customer + lead id + status pill ===== */}
        <div className="px-3.5 pt-3 pb-2 flex items-start gap-2.5">
          <span className="h-11 w-11 rounded-full overflow-hidden grid place-items-center font-display text-sm font-bold text-[color:oklch(0.20_0.01_260)] flex-shrink-0 bg-[#eef0f3] border border-white shadow-sm">
            {avatar ? <img src={avatar} alt={lead.name} className="h-full w-full object-cover" /> : initial}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display text-[15px] font-bold text-slate-900 leading-tight truncate">{lead.name}</p>
            <p className="text-[10px] text-[color:oklch(0.45_0.01_260)] underline underline-offset-2">Customer | details</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{formatLiveDate(lead.createdAtIso) || lead.time}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[9px] text-slate-500">Lead id - <span className="font-mono font-semibold text-slate-700">{lead.leadCode}</span></span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold ${statusPillCls}`}>
              <span className="relative h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-current opacity-30 animate-ping" />
                <span className="absolute inset-0 rounded-full bg-current" />
              </span>
              <span className="flex flex-col leading-tight">
                <span>{st.label}</span>
                <span className="text-[8px] font-medium opacity-80 underline underline-offset-2">Live status update</span>
              </span>
            </span>
          </div>
        </div>

        {/* ===== PRODUCT CARD (inner) ===== */}
        <div className="mx-3 mb-2 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-3 flex items-center gap-3 relative">
          <div className="flex-1 min-w-0">
            <p className="font-display text-[15px] font-bold text-slate-900 leading-tight truncate">
              {lead.service}
            </p>
            <p className="text-[10px] text-slate-500 italic mt-0.5 truncate">
              {lead.note ? lead.note : "Good and best service"}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-800">
                ★ {lead.rating ?? 4.9}
              </span>
              {lead.amount > 0 && (
                <span className="font-display text-sm font-bold text-slate-800">
                  ₹ {lead.amount.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0 bg-[#eef0f3] grid place-items-center">
            {lead.productImage ? (
              <img src={lead.productImage} alt={lead.service} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-slate-400 px-1 text-center leading-tight">{lead.service.split(" ")[0]}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1">
            <ProgressRing pct={pct} status={lead.status} />
          </div>
        </div>
      </button>

      {/* ===== Action bar ===== */}
      <div className="flex items-stretch border-t border-slate-200/70">
        {isLocked ? (
          <button
            onClick={onAccept}
            className="btn-3d flex-1 py-2.5 grid place-items-center font-display font-bold text-sm text-[color:oklch(0.20_0.01_260)] active:scale-[0.97]"
            style={{ background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 50%, #a8acb3 100%)" }}
          >
            ✓ Accept Lead
          </button>
        ) : (
          <button disabled className="flex-1 py-2.5 text-sm font-display font-bold text-[color:oklch(0.55_0.10_82)] bg-[color:oklch(0.97_0.02_85)]">
            {st.label}
          </button>
        )}
        <a href={`tel:${lead.phone}`} aria-label="Call" className="px-4 grid place-items-center border-l border-slate-200/70 active:scale-95">
          <Phone className="h-4 w-4 text-[color:oklch(0.42_0.01_260)]" />
        </a>
        <Link
          to="/vendor/chat"
          search={{ leadId: lead.id } as never}
          aria-label="Open chat"
          className="px-4 grid place-items-center border-l border-slate-200/70 active:scale-95"
        >
          <MessageCircle className="h-4 w-4 text-[color:oklch(0.42_0.01_260)]" />
        </Link>
      </div>
    </article>
  );
}


function DockItem({ label, icon, active, badge, onClick }: { label: string; icon: React.ReactNode; active?: boolean; badge?: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="relative flex flex-col items-center gap-0.5 px-3 py-1 active:scale-95 transition">
      <span className={`relative h-8 w-8 rounded-full grid place-items-center ${active ? "bg-[color:oklch(0.97_0.05_85)] text-[color:oklch(0.42_0.01_260)]" : "text-[color:oklch(0.55_0.10_82)]"}`}>
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[9px] font-bold border border-white shadow animate-pulse">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className={`text-[9px] font-bold ${active ? "text-[color:oklch(0.42_0.01_260)]" : "text-[color:oklch(0.55_0.10_82)]"}`}>
        {label}
      </span>
    </button>
  );
}
