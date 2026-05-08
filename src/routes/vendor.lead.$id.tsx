import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  MapPin,
  Mail,
  Receipt,
  Store,
  Zap,
  PhoneCall,
  CalendarClock,
  StickyNote,
  Wallet,
} from "lucide-react";
import { LEADS, SOURCE_LABEL, STATUS_LABEL } from "@/lib/leads";
import type { Lead, LeadEvent, LeadStatus, LeadSource } from "@/lib/leads";

export const Route = createFileRoute("/vendor/lead/$id")({
  head: () => ({
    meta: [
      { title: "Lead Details — Vendor" },
      { name: "description", content: "Full lead information, timeline and one-tap contact actions." },
    ],
  }),
  loader: ({ params }) => {
    const lead = LEADS.find((l) => l.id === params.id);
    if (!lead) throw notFound();
    return { lead };
  },
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-2xl text-silver-gradient font-bold">Lead not found</h1>
        <p className="text-sm text-[color:oklch(0.45_0.01_260)] mt-2">
          This lead may have been removed.
        </p>
        <Link
          to="/vendor/dashboard"
          className="inline-block mt-4 px-4 py-2 rounded-xl font-display font-bold text-sm text-[color:oklch(0.20_0.01_260)]"
          style={{ background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3)" }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen grid place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-xl font-bold">Something went wrong</h1>
        <p className="text-xs text-[color:oklch(0.45_0.01_260)] mt-1">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 rounded-xl font-display font-bold text-sm text-[color:oklch(0.20_0.01_260)]"
          style={{ background: "linear-gradient(180deg, #eef0f3, #d8dde3, #a8acb3)" }}
        >
          Try again
        </button>
      </div>
    </div>
  ),
  component: LeadDetailPage,
});

const SOURCE_ICON: Record<LeadSource, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-3 w-3" />,
  call: <Phone className="h-3 w-3" />,
  digital: <Store className="h-3 w-3" />,
  quick: <Zap className="h-3 w-3" />,
};

const STATUS_ICON: Record<LeadStatus, React.ReactNode> = {
  new: <AlertCircle className="h-3.5 w-3.5" />,
  process: <Clock className="h-3.5 w-3.5" />,
  success: <CheckCircle2 className="h-3.5 w-3.5" />,
  rejected: <XCircle className="h-3.5 w-3.5" />,
};

const STATUS_TINT: Record<LeadStatus, string> = {
  new: "bg-[#eef0f3] text-[#3f4750] border-[#d8dde3]",
  process: "bg-[#f5f6f8] text-[color:oklch(0.42_0.01_260)] border-[#eef0f3]",
  success: "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]",
  rejected: "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]",
};

function LeadDetailPage() {
  const { lead: initial } = Route.useLoaderData();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead>(initial);
  const [confirm, setConfirm] = useState<null | "accept" | "reject">(null);

  const pushEvent = (e: LeadEvent, status?: LeadStatus) => {
    setLead((prev) => ({
      ...prev,
      status: status ?? prev.status,
      timeline: [...prev.timeline, e],
    }));
  };

  const handleAccept = () => {
    pushEvent({ at: "Just now", label: "Lead accepted by you", kind: "accepted" }, "process");
    setConfirm(null);
  };

  const handleReject = () => {
    pushEvent({ at: "Just now", label: "Lead rejected", kind: "rejected" }, "rejected");
    setConfirm(null);
  };

  const logContact = (kind: "call" | "wa") => {
    pushEvent({
      at: "Just now",
      label: kind === "call" ? `Called ${lead.phone}` : `WhatsApp opened · ${lead.phone}`,
      kind: "contacted",
    });
  };

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden overflow-y-auto pb-40 isolate"
      style={{
        background:
          "radial-gradient(ellipse at top, #f5f6f8 0%, transparent 55%), linear-gradient(160deg, #f5f6f8 0%, #f5f6f8 60%, #eef0f3 100%)",
      }}
    >
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.84_0.15_85/0.18),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.94_0.08_92/0.25),transparent_70%)] blur-2xl" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[color:oklch(0.72_0.01_260/0.35)]">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate({ to: "/vendor/dashboard" })}
            aria-label="Back"
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.5)] shadow-sm active:scale-90"
          >
            <ArrowLeft className="h-4 w-4 text-[color:oklch(0.42_0.01_260)]" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ Lead Details ✦
            </p>
            <h1 className="font-display text-lg text-silver-gradient leading-tight font-bold truncate">
              {lead.id}
            </h1>
          </div>
          <span className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.72_0.01_260/0.5)] shadow-sm">
            <Sparkles className="h-4 w-4 text-[#a8acb3]" />
          </span>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4 relative">
        {/* Hero customer card */}
        <section
          className="relative rounded-3xl overflow-hidden p-4 text-[color:oklch(0.20_0.01_260)] shadow-[0_12px_30px_-10px_rgba(212,175,55,0.55)]"
          style={{
            background:
              "linear-gradient(135deg, #f5f6f8 0%, #d8dde3 35%, #a8acb3 80%, #6b7280 100%)",
            border: "1.5px solid rgba(255,255,255,0.6)",
          }}
        >
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0 1px, transparent 1px 18px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.4) 0 1px, transparent 1px 18px)",
            }}
          />
          <div className="relative flex items-start gap-3">
            <span className="h-14 w-14 rounded-2xl bg-white grid place-items-center font-display text-2xl font-bold shadow">
              {lead.name.charAt(0)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] opacity-80">Customer</p>
              <h2 className="font-display text-xl font-bold leading-tight truncate">{lead.name}</h2>
              <p className="text-xs italic opacity-90 truncate">{lead.service}</p>
            </div>
          </div>

          <div className="relative my-3 border-t border-dashed border-white/70" />

          <div className="relative grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/90 px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[color:oklch(0.45_0.01_260)]">
                Quote
              </p>
              <p className="font-display text-lg font-bold text-silver-gradient leading-tight">
                ₹{lead.amount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[color:oklch(0.45_0.01_260)]">
                Source
              </p>
              <p className="font-display text-sm font-bold flex items-center gap-1 text-[color:oklch(0.20_0.01_260)] leading-tight mt-0.5">
                {SOURCE_ICON[lead.source]} {SOURCE_LABEL[lead.source]}
              </p>
            </div>
          </div>

          <div className="relative mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_TINT[lead.status]}`}
            >
              {STATUS_ICON[lead.status]}
              {STATUS_LABEL[lead.status]}
            </span>
          </div>
        </section>

        {/* One-tap actions: Live Chat + Status update */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            to="/vendor/chat"
            onClick={() => logContact("wa")}
            className="btn-3d rounded-2xl px-3 py-3 flex items-center gap-2 justify-center font-display font-bold text-sm text-[color:oklch(0.20_0.01_260)] shadow-silver-glow active:scale-[0.97]"
            style={{
              background: "linear-gradient(180deg, #eef0f3 0%, #d8dde3 50%, #a8acb3 100%)",
              border: "1.5px solid rgba(255,255,255,0.6)",
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Live Chat
          </Link>
          <button
            onClick={() => {
              const next: LeadStatus =
                lead.status === "process" ? "success" : lead.status === "new" ? "process" : lead.status;
              pushEvent(
                {
                  at: "Just now",
                  label: `Status updated → ${STATUS_LABEL[next]}`,
                  kind: next === "success" ? "payment" : "scheduled",
                },
                next,
              );
            }}
            className="btn-3d rounded-2xl px-3 py-3 flex items-center gap-2 justify-center font-display font-bold text-sm text-white shadow-md active:scale-[0.97]"
            style={{
              background: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)",
              border: "1.5px solid rgba(255,255,255,0.45)",
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Update Status
          </button>
        </section>

        {/* Contact info */}
        <section className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-3 shadow-sm space-y-2">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
            Contact Information
          </p>
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={lead.phone} />
          {lead.email && (
            <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={lead.email} />
          )}
          {lead.address && (
            <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={lead.address} />
          )}
          <InfoRow icon={<Receipt className="h-3.5 w-3.5" />} label="Lead ID" value={lead.id} />
          <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Received" value={lead.time} />
        </section>

        {/* Note */}
        <section className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-3 shadow-sm">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold flex items-center gap-1">
            <StickyNote className="h-3 w-3" /> Customer Note
          </p>
          <p className="text-sm italic text-[color:oklch(0.30_0.05_85)] mt-1 leading-relaxed">
            “{lead.note}”
          </p>
        </section>

        {/* Timeline */}
        <section className="rounded-2xl bg-white border border-[color:oklch(0.72_0.01_260/0.4)] p-3 shadow-sm">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold mb-3">
            Activity Timeline
          </p>
          <ol className="relative pl-6 space-y-3 before:content-[''] before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-gradient-to-b before:from-[#d8dde3] before:via-[#a8acb3] before:to-transparent">
            {lead.timeline.map((ev, i) => (
              <TimelineItem key={i} event={ev} latest={i === lead.timeline.length - 1} />
            ))}
          </ol>
        </section>
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] pointer-events-none">
        <div className="max-w-md mx-auto px-4 pb-3 pointer-events-auto">
          <div
            className="rounded-3xl bg-white/95 backdrop-blur-md border border-[color:oklch(0.72_0.01_260/0.55)] shadow-[0_-10px_32px_-8px_rgba(212,175,55,0.4)] p-2 flex items-stretch gap-2"
          >
            {lead.status === "new" ? (
              <>
                <button
                  onClick={() => setConfirm("reject")}
                  className="flex-1 py-2.5 rounded-2xl font-display font-bold text-sm text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca] active:scale-[0.97] flex items-center justify-center gap-1.5"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
                <button
                  onClick={() => setConfirm("accept")}
                  className="btn-3d flex-[1.6] py-2.5 rounded-2xl font-display font-bold text-sm text-[color:oklch(0.20_0.01_260)] active:scale-[0.97] flex items-center justify-center gap-1.5 shadow-silver-glow"
                  style={{
                    background:
                      "linear-gradient(180deg, #eef0f3 0%, #d8dde3 35%, #a8acb3 75%, #3f4750 100%)",
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" /> Accept Lead
                </button>
              </>
            ) : lead.status === "process" ? (
              <button
                onClick={() =>
                  pushEvent(
                    { at: "Just now", label: "Marked as completed · Payout requested", kind: "payment" },
                    "success",
                  )
                }
                className="btn-3d flex-1 py-2.5 rounded-2xl font-display font-bold text-sm text-[color:oklch(0.20_0.01_260)] flex items-center justify-center gap-1.5 shadow-silver-glow"
                style={{
                  background:
                    "linear-gradient(180deg, #eef0f3 0%, #d8dde3 35%, #a8acb3 75%, #3f4750 100%)",
                }}
              >
                <Wallet className="h-4 w-4" /> Mark Completed
              </button>
            ) : (
              <button
                disabled
                className="flex-1 py-2.5 rounded-2xl font-display font-bold text-sm text-[color:oklch(0.55_0.10_82)] bg-[color:oklch(0.97_0.02_85)] border border-[color:oklch(0.72_0.01_260/0.3)]"
              >
                {STATUS_LABEL[lead.status]}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <button
            aria-label="Close"
            onClick={() => setConfirm(null)}
            className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
            style={{ animation: "overlay-in 0.3s ease-out" }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #f5f6f8 35%, #f5f6f8 100%)",
              boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
              animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div className="pt-3 pb-1 grid place-items-center">
              <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#a8acb3] via-[#d8dde3] to-[#a8acb3]" />
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
                ✦ Confirm ✦
              </p>
              <h3 className="font-display text-xl text-silver-gradient font-bold mt-1">
                {confirm === "accept" ? "Accept this lead?" : "Reject this lead?"}
              </h3>
              <p className="text-xs text-[color:oklch(0.45_0.01_260)] mt-2">
                {confirm === "accept"
                  ? `You'll be assigned to ${lead.name}'s ${lead.service} request.`
                  : "This lead will be moved to rejected. You can't undo this."}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 py-2.5 rounded-2xl font-display font-bold text-sm text-[color:oklch(0.42_0.01_260)] bg-white border border-[color:oklch(0.72_0.01_260/0.5)]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirm === "accept" ? handleAccept : handleReject}
                  className="btn-3d flex-1 py-2.5 rounded-2xl font-display font-bold text-sm shadow-silver-glow"
                  style={
                    confirm === "accept"
                      ? {
                          background:
                            "linear-gradient(180deg, #eef0f3 0%, #d8dde3 35%, #a8acb3 75%, #3f4750 100%)",
                          color: "oklch(0.20 0.01 260)",
                        }
                      : { background: "linear-gradient(180deg, #ef4444, #b91c1c)", color: "white" }
                  }
                >
                  {confirm === "accept" ? "Yes, Accept" : "Yes, Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="h-7 w-7 rounded-full bg-[color:oklch(0.97_0.05_85)] grid place-items-center text-[color:oklch(0.42_0.01_260)] flex-shrink-0 mt-0.5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-[0.2em] text-[color:oklch(0.55_0.10_82)] font-bold">
          {label}
        </p>
        <p className="text-sm text-[color:oklch(0.25_0.01_260)] font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

const KIND_META: Record<
  LeadEvent["kind"],
  { color: string; bg: string; icon: React.ReactNode }
> = {
  created: {
    color: "text-[color:oklch(0.42_0.01_260)]",
    bg: "bg-[#f5f6f8] border-[#d8dde3]",
    icon: <Sparkles className="h-3 w-3" />,
  },
  accepted: {
    color: "text-[#15803d]",
    bg: "bg-[#f0fdf4] border-[#bbf7d0]",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    color: "text-[#b91c1c]",
    bg: "bg-[#fef2f2] border-[#fecaca]",
    icon: <XCircle className="h-3 w-3" />,
  },
  contacted: {
    color: "text-[color:oklch(0.42_0.01_260)]",
    bg: "bg-white border-[color:oklch(0.72_0.01_260/0.5)]",
    icon: <MessageCircle className="h-3 w-3" />,
  },
  scheduled: {
    color: "text-[color:oklch(0.42_0.01_260)]",
    bg: "bg-[#f5f6f8] border-[#eef0f3]",
    icon: <CalendarClock className="h-3 w-3" />,
  },
  payment: {
    color: "text-[#3f4750]",
    bg: "bg-[#eef0f3] border-[#a8acb3]",
    icon: <Wallet className="h-3 w-3" />,
  },
  note: {
    color: "text-[color:oklch(0.45_0.01_260)]",
    bg: "bg-white border-[color:oklch(0.72_0.01_260/0.4)]",
    icon: <StickyNote className="h-3 w-3" />,
  },
};

function TimelineItem({ event, latest }: { event: LeadEvent; latest: boolean }) {
  const meta = KIND_META[event.kind];
  return (
    <li className="relative">
      <span
        className={`absolute -left-6 top-0.5 h-5 w-5 rounded-full border grid place-items-center ${meta.bg} ${meta.color} ${
          latest ? "shadow-silver-glow" : ""
        }`}
      >
        {meta.icon}
      </span>
      <div className="flex items-baseline justify-between gap-2">
        <p className={`text-sm font-display font-bold ${meta.color}`}>{event.label}</p>
      </div>
      <p className="text-[10px] text-[color:oklch(0.55_0.10_82)] mt-0.5">{event.at}</p>
    </li>
  );
}
