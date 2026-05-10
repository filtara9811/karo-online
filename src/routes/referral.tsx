import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Copy, Share2, MessageCircle, Check, Gift, Users, Wallet, Clock, ChevronLeft, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useReferralOverview, type ReferralRow } from "@/hooks/use-referral";
import { toast } from "sonner";

export const Route = createFileRoute("/referral")({
  head: () => ({
    meta: [
      { title: "Invite & Earn — Karo Online" },
      { name: "description", content: "Refer friends, track their journey and earn rewards in your wallet." },
    ],
  }),
  component: ReferralPage,
});

function ReferralPage() {
  const router = useRouter();
  const { data, loading, refresh } = useReferralOverview();
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (!data?.code || typeof window === "undefined") return "";
    return `${window.location.origin}/r/${data.code}`;
  }, [data?.code]);

  const shareText = `Join me on Karo Online! Use my code ${data?.code ?? ""} to sign up: ${shareUrl}`;

  const copyCode = async () => {
    if (!data?.code) return;
    await navigator.clipboard.writeText(data.code);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 1500);
  };
  const openWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  const nativeShare = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) try { await nav.share({ title: "Karo Online", text: shareText, url: shareUrl }); } catch { /* ignore */ }
    else openWhatsApp();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.history.back()} className="h-9 w-9 rounded-full grid place-items-center bg-amber-50 border border-amber-200 active:scale-95">
            <ChevronLeft className="h-5 w-5 text-amber-700" />
          </button>
          <h1 className="font-display text-xl font-bold bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] bg-clip-text text-transparent">
            Invite & Earn
          </h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
          style={{ background: "linear-gradient(135deg,#b45309 0%,#d4af37 50%,#f59e0b 100%)" }}
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center gap-2 mb-2 relative">
            <Sparkles className="h-4 w-4" />
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold opacity-90">Referral Program</p>
          </div>
          <h2 className="font-display text-2xl font-bold leading-tight">Share Karo Online,<br/>earn real rewards</h2>
          <p className="text-xs opacity-90 mt-1">Reward credits to your wallet when your friends complete milestones.</p>

          <div className="mt-4 rounded-2xl bg-white/15 backdrop-blur p-3 flex items-center gap-3 border border-white/20">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider opacity-80">Your Code</p>
              <p className="font-mono text-lg font-bold tracking-wider">{loading ? "…" : data?.code ?? "—"}</p>
            </div>
            <button onClick={copyCode} className="h-10 w-10 grid place-items-center rounded-xl bg-white text-amber-700 shadow active:scale-95">
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={openWhatsApp} className="rounded-xl bg-emerald-500 px-3 py-2.5 font-semibold text-sm flex items-center justify-center gap-2 shadow active:scale-95">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
            <button onClick={nativeShare} className="rounded-xl bg-white text-amber-700 px-3 py-2.5 font-semibold text-sm flex items-center justify-center gap-2 shadow active:scale-95">
              <Share2 className="h-4 w-4" /> Share link
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile icon={Wallet} label="Earned" value={`₹${data?.stats.earnings_total ?? 0}`} tone="from-emerald-500 to-emerald-600" />
          <StatTile icon={Clock} label="Pending" value={`₹${data?.stats.earnings_pending ?? 0}`} tone="from-amber-500 to-amber-600" />
          <StatTile icon={Users} label="Invited" value={data?.stats.total_invited ?? 0} tone="from-sky-500 to-sky-600" />
          <StatTile icon={Gift} label="Successful" value={data?.stats.successful ?? 0} tone="from-rose-500 to-rose-600" />
        </div>

        {/* Progress list */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="font-display text-lg font-bold text-slate-800">Your referrals</h3>
            <button onClick={refresh} className="text-xs text-amber-700 font-semibold">Refresh</button>
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
            {data?.referrals.map((r) => <ProgressCard key={r.id} row={r} />)}
          </div>
        </section>

        {/* Rules */}
        <section className="rounded-2xl bg-white border border-amber-200 p-4">
          <h3 className="font-display text-base font-bold text-slate-800 mb-2">How it works</h3>
          <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
            <li>Share your code or link with friends.</li>
            <li>They install, register and verify OTP.</li>
            <li>Once they complete the milestone set by admin (KYC, first order, payment), your reward is released.</li>
            <li>Approved rewards land in your wallet automatically.</li>
            <li>Self-referrals and duplicate device/IP signups are flagged for review.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone }: { icon: typeof Gift; label: string; value: string | number; tone: string }) {
  return (
    <div className={`rounded-2xl p-3 text-white shadow-md bg-gradient-to-br ${tone}`}>
      <div className="h-9 w-9 rounded-xl grid place-items-center bg-white/20 mb-2">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-display text-xl font-bold leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider opacity-90 mt-1">{label}</p>
    </div>
  );
}

const STEPS: Array<{ key: keyof ReferralRow["progress"]; label: string }> = [
  { key: "installed", label: "Installed" },
  { key: "registered", label: "Registered" },
  { key: "otp_verified", label: "OTP" },
  { key: "kyc_completed", label: "KYC" },
  { key: "first_order_placed", label: "Order" },
  { key: "payment_completed", label: "Paid" },
  { key: "reward_released", label: "Reward" },
];

function ProgressCard({ row }: { row: ReferralRow }) {
  const initials = (row.name ?? "U").slice(0, 1).toUpperCase();
  return (
    <div className="rounded-2xl bg-white border border-amber-200 p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full overflow-hidden border border-amber-200 bg-amber-50 grid place-items-center text-amber-700 font-bold">
          {row.avatar_url ? <img src={row.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800 truncate">{row.name ?? "New user"}</p>
          <p className="text-[11px] text-slate-500 truncate">{row.phone ?? "—"}</p>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
          row.status === "approved" ? "bg-emerald-50 text-emerald-700"
            : row.status === "rejected" ? "bg-rose-50 text-rose-700"
            : row.status === "locked" ? "bg-amber-50 text-amber-700"
            : "bg-slate-50 text-slate-600"
        }`}>{row.status}</span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {STEPS.map((s) => {
          const done = !!row.progress[s.key];
          return (
            <div key={s.key} className="flex flex-col items-center gap-1">
              <div className={`h-6 w-6 rounded-full grid place-items-center text-[10px] font-bold ${done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                {done ? "✓" : "•"}
              </div>
              <span className={`text-[8px] uppercase tracking-wider ${done ? "text-emerald-700" : "text-slate-400"}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
