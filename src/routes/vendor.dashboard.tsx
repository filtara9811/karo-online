import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
} from "lucide-react";
import avatarUser from "@/assets/avatar-user.png";
import { LEADS as SHARED_LEADS } from "@/lib/leads";
import type { Lead, LeadSource, LeadStatus } from "@/lib/leads";

export const Route = createFileRoute("/vendor/dashboard")({
  head: () => ({
    meta: [
      { title: "Vendor Dashboard — Karo Online" },
      { name: "description", content: "Manage your leads, products and digital shop." },
    ],
  }),
  component: VendorDashboard,
});

const LEADS: Lead[] = SHARED_LEADS;

const POTENTIAL = [
  { id: "P-01", title: "Kotak 811 Savings Account", earn: 2400, customers: 12, chance: "High" },
  { id: "P-02", title: "IndusInd Savings Account", earn: 8400, customers: 14, chance: "High" },
  { id: "P-03", title: "Bajaj Finserv Securities", earn: 800, customers: 16, chance: "High" },
  { id: "P-04", title: "Axis Bank Credit Card", earn: 6700, customers: 9, chance: "Medium" },
];

function VendorDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"my" | "potential">("my");
  const [leads, setLeads] = useState<Lead[]>(LEADS);

  const stats = useMemo(() => {
    const total = leads.length;
    const success = leads.filter((l) => l.status === "success").length;
    const process = leads.filter((l) => l.status === "process").length;
    const rejected = leads.filter((l) => l.status === "rejected").length;
    const action = leads.filter((l) => l.status === "new").length;
    return { total, success, process, rejected, action };
  }, [leads]);

  const acceptLead = (id: string) => {
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

      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[color:oklch(0.72_0.01_260/0.35)]">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            aria-label="Back"
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.5)] shadow-sm active:scale-90"
          >
            <ArrowLeft className="h-4 w-4 text-[color:oklch(0.42_0.01_260)]" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">✦ Vendor Panel ✦</p>
            <h1 className="font-display text-lg text-silver-gradient leading-tight font-bold">My Dashboard</h1>
          </div>
          <button
            aria-label="Notifications"
            className="relative h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.5)] shadow-sm active:scale-90"
          >
            <Bell className="h-4 w-4 text-[color:oklch(0.42_0.01_260)]" />
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-gradient-to-br from-[#d8dde3] to-[#3f4750] text-[8px] font-bold text-white grid place-items-center">
              {stats.action}
            </span>
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4 relative">
        {/* Vendor profile chip */}
        <section
          className="relative rounded-2xl overflow-hidden p-3 flex items-center gap-3 shadow-silver-glow"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f5f6f8 60%, #eef0f3 100%)",
            border: "1px solid rgba(212,175,55,0.5)",
          }}
        >
          <span className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-[color:oklch(0.72_0.01_260/0.7)] shadow-silver-glow">
            <img src={avatarUser} alt="" className="h-full w-full object-cover" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)]">Verified Vendor · ID K-91824</p>
            <p className="font-display text-base text-silver-gradient font-bold truncate">Ashhu Qureshi</p>
            <p className="text-[10px] text-[color:oklch(0.45_0.01_260)] italic truncate">Quick Service · Beauty · Delhi NCR</p>
          </div>
          <Sparkles className="h-5 w-5 text-[#a8acb3]" />
        </section>

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
              className="relative rounded-3xl overflow-hidden p-4 text-[color:oklch(0.20_0.01_260)] shadow-[0_12px_30px_-10px_rgba(212,175,55,0.55)]"
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
                  <p className="text-xs italic opacity-75">See all leads here</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-12 w-14 rounded-2xl bg-white text-[color:oklch(0.20_0.01_260)] grid place-items-center font-display text-2xl font-bold shadow">
                    {stats.total}
                  </span>
                  <button
                    aria-label="Download"
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
              {leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onAccept={() => acceptLead(lead.id)} />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {POTENTIAL.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-14 w-14 rounded-xl grid place-items-center font-display text-xl font-bold text-[color:oklch(0.20_0.01_260)]"
                    style={{ background: "linear-gradient(135deg, #f5f6f8, #d8dde3, #a8acb3)" }}
                  >
                    {p.title.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-[color:oklch(0.25_0.01_260)] truncate">
                      {p.title}
                    </p>
                    <p className="text-xs font-bold text-[color:oklch(0.42_0.01_260)]">
                      Earn upto ₹{p.earn.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-xl bg-[color:oklch(0.97_0.02_85)] border border-[color:oklch(0.72_0.01_260/0.3)] px-3 py-2">
                  <div className="text-xs">
                    <p className="font-bold text-[color:oklch(0.25_0.01_260)]">
                      Customer Eligible: {p.customers}
                    </p>
                    <p className="text-[10px] text-[color:oklch(0.45_0.01_260)] flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-[#a8acb3]" />
                      {p.customers} customers · {p.chance} approval chance
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[color:oklch(0.55_0.10_82)]" />
                </div>
              </article>
            ))}
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
            <DockItem label="Leads" icon={<TrendingUp className="h-4 w-4" />} active />
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

function LeadCard({ lead, onAccept }: { lead: Lead; onAccept: () => void }) {
  const src = SOURCE_META[lead.source];
  const st = STATUS_META[lead.status];
  return (
    <article className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] overflow-hidden shadow-sm">
      {lead.status === "new" ? (
        <div
          aria-disabled
          title="Accept this lead to view full details"
          className="block p-3 cursor-not-allowed select-none"
        >
        <div className="flex items-start gap-3">
          <span
            className="h-12 w-12 rounded-xl grid place-items-center font-display text-base font-bold text-[color:oklch(0.20_0.01_260)] flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #f5f6f8, #d8dde3)" }}
          >
            {lead.name.charAt(0)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-sm font-bold text-[color:oklch(0.25_0.01_260)] truncate">{lead.name}</p>
              <span className="text-[9px] text-[color:oklch(0.55_0.10_82)] flex-shrink-0">{lead.time}</span>
            </div>
            <p className="text-[11px] text-[color:oklch(0.45_0.01_260)] truncate">{lead.service} · {lead.phone}</p>
            {/* Source badge */}
            <span
              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-[color:oklch(0.72_0.01_260/0.4)]"
              style={{ background: src.bg, color: src.text }}
            >
              {src.icon}
              via {src.label}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-[color:oklch(0.55_0.10_82)] flex-shrink-0 mt-1" />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${st.tint}`}>
            {st.icon}
            {st.label}
          </span>
          <span className="font-display text-sm font-bold text-silver-gradient">
            ₹{lead.amount.toLocaleString()}
          </span>
        </div>

        <p className="mt-1 text-[11px] italic text-[color:oklch(0.45_0.01_260)] truncate">
          “{lead.note}”
        </p>
      </Link>

      {/* Action bar */}
      <div className="flex items-stretch border-t border-[color:oklch(0.72_0.01_260/0.3)]">
        {lead.status === "new" ? (
          <button
            onClick={onAccept}
            className="btn-3d flex-1 py-2.5 grid place-items-center font-display font-bold text-sm text-[color:oklch(0.20_0.01_260)] active:scale-[0.97]"
            style={{
              background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 50%, #a8acb3 100%)",
            }}
          >
            ✓ Accept Lead
          </button>
        ) : (
          <button
            disabled
            className="flex-1 py-2.5 text-sm font-display font-bold text-[color:oklch(0.55_0.10_82)] bg-[color:oklch(0.97_0.02_85)]"
          >
            {st.label}
          </button>
        )}
        <a
          href={`tel:${lead.phone}`}
          aria-label="Call"
          className="px-4 grid place-items-center border-l border-[color:oklch(0.72_0.01_260/0.3)] active:scale-95"
        >
          <Phone className="h-4 w-4 text-[color:oklch(0.42_0.01_260)]" />
        </a>
        <a
          href={`https://wa.me/${lead.phone}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="px-4 grid place-items-center border-l border-[color:oklch(0.72_0.01_260/0.3)] active:scale-95"
        >
          <MessageCircle className="h-4 w-4 text-[color:oklch(0.42_0.01_260)]" />
        </a>
      </div>
    </article>
  );
}

function DockItem({ label, icon, active }: { label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <button className="flex flex-col items-center gap-0.5 px-3 py-1">
      <span className={`h-8 w-8 rounded-full grid place-items-center ${active ? "bg-[color:oklch(0.97_0.05_85)] text-[color:oklch(0.42_0.01_260)]" : "text-[color:oklch(0.55_0.10_82)]"}`}>
        {icon}
      </span>
      <span className={`text-[9px] font-bold ${active ? "text-[color:oklch(0.42_0.01_260)]" : "text-[color:oklch(0.55_0.10_82)]"}`}>
        {label}
      </span>
    </button>
  );
}
