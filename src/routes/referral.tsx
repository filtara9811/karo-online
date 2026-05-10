import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Share2, MessageCircle, Check, Gift, Users, Wallet, Clock,
  ChevronLeft, Sparkles, Phone, Download, TrendingUp, AlertCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useReferralOverview, type ReferralRow } from "@/hooks/use-referral";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

export const Route = createFileRoute("/referral")({
  head: () => ({
    meta: [
      { title: "Refer & Earn ₹200 — Karo Online" },
      { name: "description", content: "Invite friends, track their journey and earn rewards in your wallet." },
    ],
  }),
  component: ReferralPage,
});

function ReferralPage() {
  const router = useRouter();
  const { data, loading, refresh } = useReferralOverview();
  const [copied, setCopied] = useState(false);
  const [activeRow, setActiveRow] = useState<ReferralRow | null>(null);

  const shareUrl = useMemo(() => {
    if (!data?.code) return "";
    return `https://karoonline.in/r/${data.code}`;
  }, [data?.code]);

  const shareText = data?.code
    ? `🎁 Refer & Earn ₹200 on Karo Online!\n\nUse my code *${data.code}* to sign up and we both get rewarded.\n\nJoin here 👉 ${shareUrl}`
    : "";

  const copyCode = async () => {
    if (!data?.code) return;
    await navigator.clipboard.writeText(data.code);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 1500);
  };
  const openWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  const nativeShare = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: "Karo Online — Refer & Earn ₹200", text: shareText, url: shareUrl }); } catch { /* ignore */ }
    } else openWhatsApp();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 pb-24">
      {/* Clean top bar */}
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.history.back()} className="h-9 w-9 rounded-full grid place-items-center bg-amber-50 border border-amber-200 active:scale-95">
            <ChevronLeft className="h-5 w-5 text-amber-700" />
          </button>
          <h1 className="font-display text-xl font-bold bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] bg-clip-text text-transparent">
            Refer &amp; Earn
          </h1>
          <button onClick={refresh} className="ml-auto text-xs text-amber-700 font-semibold">Refresh</button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {/* Hero share card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl shadow-xl border border-amber-200"
        >
          <img src="/referral-share-banner.jpg" alt="Refer & Earn ₹200" className="w-full h-auto block" />
          <div className="bg-white p-4">
            <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-amber-700">Your code</p>
                <p className="font-mono text-lg font-bold text-amber-800 tracking-wider">{loading ? "…" : data?.code ?? "—"}</p>
              </div>
              <button onClick={copyCode} className="h-10 w-10 grid place-items-center rounded-xl bg-amber-700 text-white shadow active:scale-95">
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={openWhatsApp} className="rounded-xl bg-emerald-500 text-white px-3 py-2.5 font-semibold text-sm flex items-center justify-center gap-2 shadow active:scale-95">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
              <button onClick={nativeShare} className="rounded-xl bg-gradient-to-r from-[#b45309] to-[#f59e0b] text-white px-3 py-2.5 font-semibold text-sm flex items-center justify-center gap-2 shadow active:scale-95">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
        </motion.div>

        {/* Analytics dashboard */}
        <section className="rounded-3xl bg-gradient-to-br from-[#1c1917] to-[#451a03] text-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-70">Total wallet earnings</p>
              <p className="font-display text-3xl font-bold mt-0.5">₹{data?.stats.earnings_total ?? 0}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/10 grid place-items-center">
              <TrendingUp className="h-6 w-6 text-amber-300" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <MiniStat label="Shared" value={data?.stats.total_invited ?? 0} tone="text-sky-300" />
            <MiniStat label="Successful" value={data?.stats.successful ?? 0} tone="text-emerald-300" />
            <MiniStat label="Pending" value={data?.stats.pending ?? 0} tone="text-amber-300" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={openWhatsApp} className="rounded-xl bg-white/10 backdrop-blur border border-white/15 px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95">
              <Share2 className="h-3.5 w-3.5" /> Share again
            </button>
            <button onClick={() => toast("Statement download coming soon")} className="rounded-xl bg-white/10 backdrop-blur border border-white/15 px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95">
              <Download className="h-3.5 w-3.5" /> Statement
            </button>
          </div>
        </section>

        {/* Referral list */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="font-display text-lg font-bold text-slate-800">Your referrals</h3>
            <span className="text-[11px] text-slate-500">{data?.referrals.length ?? 0} total</span>
          </div>

          {loading && <p className="text-center text-xs text-slate-400 py-8">Loading…</p>}
          {!loading && (data?.referrals.length ?? 0) === 0 && (
            <div className="rounded-2xl bg-white border border-amber-200 p-6 text-center">
              <Gift className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-semibold">No referrals yet</p>
              <p className="text-xs text-slate-400 mt-1">Share your code to start earning</p>
            </div>
          )}
          <div className="space-y-3">
            {data?.referrals.map((r) => (
              <ReferralCard key={r.id} row={r} onTap={() => setActiveRow(r)} shareText={shareText} />
            ))}
          </div>
        </section>

        {/* Rules */}
        <section className="rounded-2xl bg-white border border-amber-200 p-4">
          <h3 className="font-display text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" /> How rewards work
          </h3>
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li>✅ Friend installs &amp; signs up — step 1 ticked</li>
            <li>✅ Friend completes KYC — step 2 ticked</li>
            <li>✅ Friend places first order — step 3 ticked</li>
            <li>✅ When they become a seller &amp; buy first lead — <b className="text-emerald-700">₹200 added to your wallet</b></li>
            <li className="text-rose-600 flex gap-1.5"><AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> Self-referrals &amp; duplicate device/IP signups are rejected.</li>
          </ul>
        </section>
      </div>

      {/* Bottom sheet — progress timeline */}
      <Sheet open={!!activeRow} onOpenChange={(o) => !o && setActiveRow(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[85vh] overflow-y-auto">
          {activeRow && <ProgressSheet row={activeRow} shareText={shareText} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/10 p-2.5">
      <p className={`font-display text-xl font-bold leading-none ${tone}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider opacity-80 mt-1">{label}</p>
    </div>
  );
}

const STEPS: Array<{ key: keyof ReferralRow["progress"]; label: string; desc: string }> = [
  { key: "installed", label: "Installed", desc: "App opened via your link" },
  { key: "registered", label: "Registered", desc: "Created an account" },
  { key: "otp_verified", label: "OTP Verified", desc: "Phone number verified" },
  { key: "kyc_completed", label: "KYC Completed", desc: "Identity verified" },
  { key: "first_order_placed", label: "First Order", desc: "Placed first order" },
  { key: "became_seller", label: "Became Seller", desc: "Joined as a vendor" },
  { key: "payment_completed", label: "First Lead Bought", desc: "Vendor purchased lead" },
  { key: "reward_released", label: "Reward Released", desc: "₹200 added to your wallet" },
];

function ReferralCard({ row, onTap, shareText }: { row: ReferralRow; onTap: () => void; shareText: string }) {
  const initials = (row.name ?? "U").slice(0, 1).toUpperCase();
  const completed = STEPS.filter((s) => row.progress[s.key]).length;
  const pct = Math.round((completed / STEPS.length) * 100);
  const statusColor =
    row.status === "approved" ? "bg-emerald-500"
      : row.status === "rejected" ? "bg-rose-500"
      : row.status === "locked" ? "bg-amber-500" : "bg-slate-400";

  const callCustomer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (row.phone) window.location.href = `tel:${row.phone}`;
    else toast.error("No phone number");
  };
  const nudgeWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Hi${row.name ? " " + row.name : ""}! 👋\nPlease complete your Karo Online signup to unlock our rewards.\n\n${shareText}`;
    const phone = (row.phone ?? "").replace(/\D/g, "");
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button onClick={onTap} className="w-full text-left rounded-2xl bg-white border border-amber-200 p-3 shadow-sm active:scale-[0.99] transition">
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 rounded-full overflow-hidden border border-amber-200 bg-amber-50 grid place-items-center text-amber-700 font-bold flex-shrink-0">
          {row.avatar_url ? <img src={row.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${statusColor} border-2 border-white`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800 truncate">{row.name ?? "New user"}</p>
          <p className="text-[11px] text-slate-500 truncate">{row.phone ?? "Phone hidden"}</p>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
          row.status === "approved" ? "bg-emerald-50 text-emerald-700"
            : row.status === "rejected" ? "bg-rose-50 text-rose-700"
            : row.status === "locked" ? "bg-amber-50 text-amber-700"
            : "bg-slate-50 text-slate-600"
        }`}>{row.status}</span>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-slate-500 font-semibold">{completed}/{STEPS.length} steps complete</span>
          <span className="text-amber-700 font-bold">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-600"
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={callCustomer} className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95">
          <Phone className="h-3.5 w-3.5" /> Call
        </button>
        <button onClick={nudgeWhatsApp} className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95">
          <MessageCircle className="h-3.5 w-3.5" /> Nudge
        </button>
      </div>
    </button>
  );
}

function ProgressSheet({ row, shareText }: { row: ReferralRow; shareText: string }) {
  const initials = (row.name ?? "U").slice(0, 1).toUpperCase();
  const callCustomer = () => row.phone ? (window.location.href = `tel:${row.phone}`) : toast.error("No phone");
  const nudge = () => {
    const text = `Hi${row.name ? " " + row.name : ""}! 👋\nPlease complete your Karo Online signup.\n\n${shareText}`;
    const phone = (row.phone ?? "").replace(/\D/g, "");
    window.open(phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="px-5 pt-5 pb-8">
      <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 mb-4" />
      <SheetHeader>
        <SheetTitle className="sr-only">Referral Progress</SheetTitle>
      </SheetHeader>

      <div className="flex items-center gap-3 mb-5">
        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-amber-200 bg-amber-50 grid place-items-center text-amber-700 font-bold">
          {row.avatar_url ? <img src={row.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-bold text-slate-800 truncate">{row.name ?? "New user"}</p>
          <p className="text-xs text-slate-500 truncate">{row.phone ?? "—"}</p>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
          row.status === "approved" ? "bg-emerald-50 text-emerald-700"
            : row.status === "rejected" ? "bg-rose-50 text-rose-700"
            : row.status === "locked" ? "bg-amber-50 text-amber-700"
            : "bg-slate-50 text-slate-600"
        }`}>{row.status}</span>
      </div>

      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 mb-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white grid place-items-center border border-amber-200">
          <Wallet className="h-5 w-5 text-amber-700" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Reward on completion</p>
          <p className="font-display text-xl font-bold text-amber-800">₹200</p>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${row.progress.reward_released ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"}`}>
          {row.progress.reward_released ? "Released" : "Locked"}
        </span>
      </div>

      {/* Vertical timeline */}
      <ol className="relative border-l-2 border-dashed border-amber-200 pl-5 space-y-4">
        {STEPS.map((s, i) => {
          const done = !!row.progress[s.key];
          const next = !done && STEPS.slice(0, i).every((p) => row.progress[p.key]);
          return (
            <li key={s.key} className="relative">
              <span className={`absolute -left-[28px] top-0 h-6 w-6 rounded-full grid place-items-center border-2 ${
                done ? "bg-emerald-500 border-emerald-500 text-white"
                  : next ? "bg-amber-100 border-amber-400 text-amber-700 animate-pulse"
                  : "bg-white border-slate-200 text-slate-300"
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3 w-3" />}
              </span>
              <p className={`text-sm font-semibold ${done ? "text-slate-800" : next ? "text-amber-700" : "text-slate-400"}`}>{s.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
            </li>
          );
        })}
      </ol>

      {/* CTA */}
      {!row.progress.reward_released && (
        <div className="grid grid-cols-2 gap-2 mt-6">
          <button onClick={callCustomer} className="rounded-xl bg-emerald-500 text-white py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow active:scale-95">
            <Phone className="h-4 w-4" /> Call now
          </button>
          <button onClick={nudge} className="rounded-xl bg-gradient-to-r from-[#b45309] to-[#f59e0b] text-white py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow active:scale-95">
            <MessageCircle className="h-4 w-4" /> Send reminder
          </button>
        </div>
      )}
    </div>
  );
}
