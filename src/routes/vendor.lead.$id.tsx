import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  Receipt,
  StickyNote,
  Truck,
  Wrench,
  Flag,
  Loader2,
} from "lucide-react";
import { VendorAuthGate } from "@/components/VendorAuthGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor/lead/$id")({
  head: () => ({
    meta: [
      { title: "Lead Details — Vendor" },
      { name: "description", content: "Full lead information, timeline and one-tap contact actions." },
    ],
  }),
  component: () => (
    <VendorAuthGate>
      <LeadDetailPage />
    </VendorAuthGate>
  ),
});

type RealLead = {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  sub_category_name: string;
  sub_category_id: string;
  item_names: string[];
  note: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  accepted_vendor_ids: string[];
  accepted_vendor_id: string | null;
  lead_price_inr: number;
  created_at: string;
  images: string[];
};

type StatusEvent = {
  id: string;
  status_key: string;
  message: string | null;
  created_at: string;
};

const STATUS_STEPS: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "accepted", label: "Accepted", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "#15803d" },
  { key: "on_the_way", label: "On the way", icon: <Truck className="h-3.5 w-3.5" />, color: "#0369a1" },
  { key: "arrived", label: "Arrived", icon: <MapPin className="h-3.5 w-3.5" />, color: "#7c3aed" },
  { key: "working", label: "Working", icon: <Wrench className="h-3.5 w-3.5" />, color: "#b45309" },
  { key: "completed", label: "Completed", icon: <Flag className="h-3.5 w-3.5" />, color: "#15803d" },
];

function LeadDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const [lead, setLead] = useState<RealLead | null>(null);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [subImage, setSubImage] = useState<string | null>(null);
  const [customerAvatar, setCustomerAvatar] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("id, customer_id, customer_name, customer_phone, sub_category_name, sub_category_id, item_names, note, address, lat, lng, status, accepted_vendor_ids, accepted_vendor_id, lead_price_inr, created_at, images")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setLead(null);
        setLoading(false);
        return;
      }
      setLead(data as RealLead);
      setLoading(false);

      const [{ data: cat }, { data: cust }, { data: evs }] = await Promise.all([
        supabase.from("categories").select("image_url, icon").eq("id", (data as any).sub_category_id).maybeSingle(),
        supabase.from("customers").select("avatar_url").eq("user_id", (data as any).customer_id).maybeSingle(),
        supabase.from("vendor_status_updates").select("id, status_key, message, created_at").eq("lead_id", id).order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setSubImage((cat as any)?.image_url ?? (cat as any)?.icon ?? null);
      setCustomerAvatar((cust as any)?.avatar_url ?? null);
      setEvents((evs ?? []) as StatusEvent[]);
    })();

    // Realtime status updates for this lead
    const ch = supabase
      .channel(`lead-status-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vendor_status_updates", filter: `lead_id=eq.${id}` },
        (payload) => {
          setEvents((p) => [...p, payload.new as StatusEvent]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [id]);

  const isAcceptedVendor = !!user && (lead?.accepted_vendor_ids ?? []).includes(user.id);
  const reachedKeys = new Set<string>(events.map((e) => e.status_key));
  if (isAcceptedVendor) reachedKeys.add("accepted");

  const sendStatus = async (status_key: string) => {
    if (!lead || !user) return;
    setBusyKey(status_key);
    try {
      const { sendStatusPushToCustomer } = await import("@/lib/push.functions");
      // Insert row (RLS allows accepted vendor); then trigger push fan-out.
      const { error } = await supabase.from("vendor_status_updates").insert({
        lead_id: lead.id,
        vendor_id: user.id,
        status_key,
      } as any);
      if (error) {
        toast.error(error.message);
      } else {
        await sendStatusPushToCustomer({ data: { lead_id: lead.id, status_key } }).catch(() => {});
        toast.success(`✓ Customer notified: ${STATUS_STEPS.find((s) => s.key === status_key)?.label}`);
      }
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-700" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl text-silver-gradient font-bold">Lead not found</h1>
          <p className="text-sm text-[color:oklch(0.45_0.01_260)] mt-2">This lead may have been removed.</p>
          <Link
            to="/vendor/dashboard"
            className="inline-block mt-4 px-4 py-2 rounded-xl font-display font-bold text-sm text-[color:oklch(0.20_0.01_260)]"
            style={{ background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3)" }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const phoneDigits = (lead.customer_phone ?? "").replace(/\D/g, "");
  const phoneDisplay = isAcceptedVendor ? lead.customer_phone : phoneDigits.length >= 4 ? `•••• ${phoneDigits.slice(-4)}` : "—";
  const heroImage = lead.images?.[0] ?? subImage;
  const initial = (lead.customer_name ?? "C").charAt(0).toUpperCase();

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden overflow-y-auto pb-40 isolate"
      style={{
        background:
          "radial-gradient(ellipse at top, #f5f6f8 0%, transparent 55%), linear-gradient(160deg, #f5f6f8 0%, #f5f6f8 60%, #eef0f3 100%)",
      }}
    >
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-[color:oklch(0.72_0.01_260/0.35)]">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate({ to: "/vendor/dashboard" })}
            aria-label="Back"
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.5)] shadow-sm active:scale-90"
          >
            <ArrowLeft className="h-4 w-4 text-[color:oklch(0.42_0.01_260)]" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">✦ Lead Details ✦</p>
            <h1 className="font-display text-sm text-silver-gradient leading-tight font-bold truncate">
              {lead.sub_category_name}
            </h1>
          </div>
          <span className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.5)] shadow-sm">
            <Sparkles className="h-4 w-4 text-[#a8acb3]" />
          </span>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4 relative">
        {/* Hero */}
        <section
          className="relative rounded-3xl overflow-hidden p-4 text-[color:oklch(0.20_0.01_260)] shadow-[0_12px_30px_-10px_rgba(212,175,55,0.55)]"
          style={{
            background: "linear-gradient(135deg, #f5f6f8 0%, #d8dde3 35%, #a8acb3 80%, #6b7280 100%)",
            border: "1.5px solid rgba(255,255,255,0.6)",
          }}
        >
          <div className="relative flex items-start gap-3">
            {customerAvatar ? (
              <img src={customerAvatar} alt="" className="h-14 w-14 rounded-2xl object-cover shadow border-2 border-white" />
            ) : (
              <span className="h-14 w-14 rounded-2xl bg-white grid place-items-center font-display text-2xl font-bold shadow">
                {initial}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] opacity-80">Customer</p>
              <h2 className="font-display text-xl font-bold leading-tight truncate">{lead.customer_name ?? "Customer"}</h2>
              <p className="text-xs italic opacity-90 truncate">{lead.sub_category_name}</p>
            </div>
            {heroImage && (
              <img src={heroImage} alt="" className="h-14 w-14 rounded-2xl object-cover shadow border-2 border-white" />
            )}
          </div>

          <div className="relative my-3 border-t border-dashed border-white/70" />

          <div className="relative grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/90 px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[color:oklch(0.45_0.01_260)]">Lead Price</p>
              <p className="font-display text-lg font-bold text-silver-gradient leading-tight">
                ₹{Number(lead.lead_price_inr ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[color:oklch(0.45_0.01_260)]">Status</p>
              <p className="font-display text-sm font-bold capitalize text-[color:oklch(0.20_0.01_260)] leading-tight mt-0.5">
                {lead.status}
              </p>
            </div>
          </div>
        </section>

        {/* One-tap call + chat */}
        <section className="grid grid-cols-2 gap-3">
          <a
            href={isAcceptedVendor && lead.customer_phone ? `tel:${lead.customer_phone}` : undefined}
            onClick={(e) => {
              if (!isAcceptedVendor) {
                e.preventDefault();
                toast.error("Accept the lead first to unlock calling.");
              }
            }}
            className="btn-3d rounded-2xl px-3 py-3 flex items-center gap-2 justify-center font-display font-bold text-sm text-white shadow-md active:scale-[0.97]"
            style={{
              background: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)",
              border: "1.5px solid rgba(255,255,255,0.45)",
            }}
          >
            <Phone className="h-4 w-4" /> Call Customer
          </a>
          <Link
            to="/vendor/chat"
            search={{ leadId: lead.id } as any}
            className="btn-3d rounded-2xl px-3 py-3 flex items-center gap-2 justify-center font-display font-bold text-sm text-[color:oklch(0.20_0.01_260)] shadow-silver-glow active:scale-[0.97]"
            style={{
              background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 50%, #a8acb3 100%)",
              border: "1.5px solid rgba(255,255,255,0.6)",
            }}
          >
            <MessageCircle className="h-4 w-4" /> Live Chat
          </Link>
        </section>

        {/* Contact info */}
        <section className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-3 shadow-sm space-y-2">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">Contact</p>
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={phoneDisplay ?? "—"} />
          {lead.address && <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={lead.address} />}
          <InfoRow icon={<Receipt className="h-3.5 w-3.5" />} label="Lead ID" value={lead.id.slice(0, 8)} />
          <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Created" value={new Date(lead.created_at).toLocaleString()} />
        </section>

        {/* Note */}
        {lead.note && (
          <section className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-3 shadow-sm">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold flex items-center gap-1">
              <StickyNote className="h-3 w-3" /> Customer Note
            </p>
            <p className="text-sm italic text-[color:oklch(0.30_0.05_85)] mt-1 leading-relaxed">“{lead.note}”</p>
          </section>
        )}

        {/* Live progress timeline */}
        <section className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-3 shadow-sm">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-3">
            Live Progress
          </p>
          <ol className="relative pl-6 space-y-3 before:content-[''] before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-gradient-to-b before:from-emerald-400 before:via-amber-400 before:to-[#e5e7eb]">
            {STATUS_STEPS.map((s) => {
              const reached = reachedKeys.has(s.key);
              const evt = events.find((e) => e.status_key === s.key);
              return (
                <li key={s.key} className="relative">
                  <span
                    className={`absolute -left-6 top-0.5 h-5 w-5 rounded-full grid place-items-center border-2 transition-colors ${
                      reached ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {s.icon}
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-sm font-display font-bold ${reached ? "text-emerald-700" : "text-gray-400"}`}>
                      {s.label}
                    </p>
                    {evt && (
                      <p className="text-[10px] text-gray-500">{new Date(evt.created_at).toLocaleTimeString()}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Status update buttons (only for accepted vendor) */}
        {isAcceptedVendor && lead.status !== "completed" && (
          <section className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-3 shadow-sm">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-2">
              Update Customer
            </p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_STEPS.filter((s) => s.key !== "accepted").map((s) => (
                <button
                  key={s.key}
                  disabled={busyKey === s.key || reachedKeys.has(s.key)}
                  onClick={() => sendStatus(s.key)}
                  className="px-3 py-2.5 rounded-2xl font-display font-bold text-xs text-white shadow-md active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: `linear-gradient(180deg, ${s.color}cc, ${s.color})` }}
                >
                  {busyKey === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : s.icon}
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-2 text-center">
              Customer ko instant notification jaayegi 🔔
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="h-7 w-7 rounded-full bg-[color:oklch(0.97_0.05_85)] grid place-items-center text-[color:oklch(0.42_0.01_260)] flex-shrink-0 mt-0.5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-[0.2em] text-[color:oklch(0.55_0.10_82)] font-bold">{label}</p>
        <p className="text-sm text-[color:oklch(0.25_0.01_260)] font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
