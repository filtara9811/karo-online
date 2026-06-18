import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Share2, MessageCircle, Check, Gift, Wallet, Clock,
  ChevronLeft, Sparkles, Phone, Download, TrendingUp, AlertCircle,
  Banknote, X, Users, Repeat, PauseCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReferralOverview, ensureMyCode44, type ReferralRow } from "@/hooks/use-referral";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { playCoinDrop } from "@/lib/coin-sound";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { QrPosterSheet } from "@/components/QrPosterSheet";
import { QrCode } from "lucide-react";

export const Route = createFileRoute("/referral")({
  head: () => ({
    meta: [
      { title: "Refer & Earn — Karo Online" },
      { name: "description", content: "Invite friends, track their journey and earn rewards in your wallet." },
    ],
  }),
  component: ReferralPage,
});

const DEFAULT_PLAY_STORE = "https://play.google.com/store/apps/details?id=app.karoonline.twa";

export function ReferralPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data, loading, refresh } = useReferralOverview();
  const { counts, items } = useNotifications();
  const [copied, setCopied] = useState(false);
  const [activeRow, setActiveRow] = useState<ReferralRow | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [code44, setCode44] = useState<string | null>(null);
  const referralUnreadItems = items.filter((item) => item.bucket === "referral" && !item.read);

  // Generate the 4+4 code (ASHU9876) once we have name + phone.
  useEffect(() => {
    const first = (profile?.name ?? "").trim().split(/\s+/)[0] ?? "";
    const phone = profile?.phone ?? "";
    if (!first || !phone) {
      setCode44(data?.code ?? null);
      return;
    }
    let cancelled = false;
    ensureMyCode44(first, phone, "customer").then((res) => {
      if (!cancelled && res?.code) setCode44(res.code);
      else if (!cancelled) setCode44(data?.code ?? null);
    });
    return () => { cancelled = true; };
  }, [profile?.name, profile?.phone, data?.code]);

  const displayCode = code44 ?? data?.code ?? "";
  const playStoreBase = data?.settings.play_store_url || DEFAULT_PLAY_STORE;

  const shareUrl = useMemo(() => {
    if (!displayCode) return "";
    const referrer = encodeURIComponent(
      `utm_source=referral&utm_medium=whatsapp&utm_campaign=refer_earn&code=${displayCode}`,
    );
    const sep = playStoreBase.includes("?") ? "&" : "?";
    return `${playStoreBase}${sep}referrer=${referrer}`;
  }, [displayCode, playStoreBase]);

  const shareText = displayCode
    ? `🎁 Refer & Earn ₹${data?.settings.base_reward_amount ?? 200} on Karo Online!\n\nUse my code *${displayCode}* to sign up and we both get rewarded.\n\n📲 Install the app 👉 ${shareUrl}`
    : "";

  const copyCode = async () => {
    if (!displayCode) return;
    await navigator.clipboard.writeText(displayCode);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 1500);
  };
  const openWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  const nativeShare = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: "Karo Online — Refer & Earn", text: shareText, url: shareUrl }); } catch { /* ignore */ }
    } else openWhatsApp();
  };

  const banner = data?.settings;
  const programPaused = data?.settings && data.settings.is_active === false;
  const baseReward = data?.settings.base_reward_amount ?? 200;

  if (!loading && programPaused) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 grid place-items-center px-6">
        <div className="max-w-sm w-full rounded-3xl bg-white border border-amber-200 p-8 text-center shadow-xl">
          <div className="h-16 w-16 rounded-full bg-amber-100 grid place-items-center mx-auto">
            <PauseCircle className="h-8 w-8 text-amber-700" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-800">Campaign Paused</h1>
          <p className="mt-2 text-sm text-slate-600">The Refer &amp; Earn program is temporarily paused. New codes and rewards will resume once it goes live again.</p>
          <button onClick={() => router.history.back()} className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#b45309] to-[#f59e0b] text-white py-3 font-bold active:scale-95">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 pb-24">

      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.history.back()} className="h-9 w-9 rounded-full grid place-items-center bg-amber-50 border border-amber-200 active:scale-95">
            <ChevronLeft className="h-5 w-5 text-amber-700" />
          </button>
          <h1 className="font-display text-xl font-bold bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#b45309] bg-clip-text text-transparent">
            Refer &amp; Earn
          </h1>
          {counts.referral > 0 && (
            <span className="min-w-[22px] h-6 px-1.5 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-white shadow">
              {counts.referral > 99 ? "99+" : counts.referral}
            </span>
          )}
          <button onClick={refresh} className="ml-auto text-xs text-amber-700 font-semibold">Refresh</button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {counts.referral > 0 && (
          <section className="rounded-2xl bg-rose-50 border border-rose-200 px-3 py-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-rose-700">{counts.referral} unread referral update{counts.referral > 1 ? "s" : ""}</p>
              <Gift className="h-4 w-4 text-rose-500 flex-shrink-0" />
            </div>
            {referralUnreadItems[0] && (
              <p className="text-[11px] text-rose-600 truncate mt-1">{referralUnreadItems[0].title} — {referralUnreadItems[0].body}</p>
            )}
          </section>
        )}

        {/* Hero share card (admin-controlled banner) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl shadow-xl border border-amber-200"
        >
          <img
            src={banner?.banner_image_url || "/referral-share-banner.jpg"}
            alt={banner?.banner_title || "Refer & Earn"}
            className="w-full h-auto block"
          />
          {banner?.offer_active && banner?.offer_label && (
            <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
              <OfferTimer label={banner.offer_label} endsAt={banner.offer_ends_at} />
            </div>
          )}
          <div className="bg-white p-4">
            <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-amber-700">Your code</p>
                <p className="font-mono text-lg font-bold text-amber-800 tracking-wider">{loading ? "…" : displayCode || "—"}</p>
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

        {/* Wallet — total + direct + team + today/month */}
        <section className="rounded-3xl bg-gradient-to-br from-[#1c1917] to-[#451a03] text-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-200/80 font-bold">Total wallet earnings</p>
              <p className="font-display text-4xl font-extrabold mt-0.5 text-[#fff8dc] drop-shadow-[0_2px_8px_rgba(212,175,55,0.45)]">
                ₹{(data?.wallet.total ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/10 grid place-items-center">
              <TrendingUp className="h-6 w-6 text-amber-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <SplitStat icon={Users} label="Direct earnings" value={`₹${(data?.wallet.personal ?? 0).toLocaleString()}`} tone="text-emerald-300" />
            <SplitStat icon={Sparkles} label="Team earnings" value={`₹${(data?.wallet.team ?? 0).toLocaleString()}`} tone="text-amber-300" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <SplitStat icon={Clock} label="Today" value={`₹${(data?.wallet.today ?? 0).toLocaleString()}`} tone="text-sky-300" />
            <SplitStat icon={Wallet} label="This month" value={`₹${(data?.wallet.this_month ?? 0).toLocaleString()}`} tone="text-white" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <MiniStat label="Shared" value={data?.stats.total_invited ?? 0} tone="text-sky-300" />
            <MiniStat label="Successful" value={data?.stats.successful ?? 0} tone="text-emerald-300" />
            <MiniStat label="Pending" value={data?.stats.pending ?? 0} tone="text-amber-300" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={openWhatsApp} className="rounded-xl bg-white/10 backdrop-blur border border-white/15 px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95">
              <Share2 className="h-3.5 w-3.5" /> Share again
            </button>
            <button onClick={() => setWithdrawOpen(true)} className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b45309] text-[#1a1208] px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-amber-900/50">
              <Banknote className="h-3.5 w-3.5" /> Withdraw to Bank
            </button>
          </div>
        </section>

        {/* Referral list */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
              Your referrals
              {counts.referral > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {counts.referral > 99 ? "99+" : counts.referral}
                </span>
              )}
            </h3>
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
              <FlipReferralCard
                key={r.id}
                row={r}
                onDetails={() => setActiveRow(r)}
                shareText={shareText}
                baseReward={baseReward}
              />
            ))}
          </div>
        </section>

        {/* Rules */}
        <section className="rounded-2xl bg-white border border-amber-200 p-4">
          <h3 className="font-display text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" /> How rewards work
          </h3>
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li><b className="text-slate-800">1.</b> Friend installs the app from Play Store and signs up</li>
            <li><b className="text-slate-800">2.</b> Friend joins as a vendor & completes activation payment (₹{data?.settings.activation_fee ?? 1000})</li>
            <li><b className="text-slate-800">3.</b> <b className="text-emerald-700">₹{data?.settings.base_reward_amount ?? 200} instantly split into your wallet</b> + team upline override 🎉</li>
            <li className="text-rose-600 flex gap-1.5"><AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> Self-referrals &amp; duplicate device/IP signups are rejected.</li>
          </ul>
        </section>
      </div>

      <Sheet open={!!activeRow} onOpenChange={(o) => !o && setActiveRow(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[85vh] overflow-y-auto">
          {activeRow && <ProgressSheet row={activeRow} shareText={shareText} />}
        </SheetContent>
      </Sheet>

      <Sheet open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[85vh] overflow-y-auto">
          <WithdrawSheet
            available={data?.wallet.total ?? 0}
            onClose={() => setWithdrawOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OfferTimer({ label, endsAt }: { label: string; endsAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = endsAt ? Math.max(0, new Date(endsAt).getTime() - now) : 0;
  const fmt = endsAt && remaining > 0
    ? (() => {
        const s = Math.floor(remaining / 1000);
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return d > 0 ? `${d}d ${h}h ${m}m` : `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
      })()
    : null;
  return (
    <div className="rounded-full bg-black/65 backdrop-blur text-white text-[10px] font-bold px-3 py-1.5 flex items-center gap-2 shadow-lg">
      <Sparkles className="h-3 w-3 text-amber-300" />
      <span>{label}</span>
      {fmt && <span className="text-amber-300 font-mono">· {fmt}</span>}
    </div>
  );
}

function SplitStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/10 p-2.5 flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-white/5 grid place-items-center"><Icon className={`h-4 w-4 ${tone}`} /></div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider opacity-70">{label}</p>
        <p className={`font-display text-sm font-bold ${tone} truncate`}>{value}</p>
      </div>
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

type ProgressKey = keyof ReferralRow["progress"];

type MacroStep = {
  key: "install" | "request" | "vendor";
  label: string;
  desc: string;
  cta: string;
  requires: ProgressKey[];
};

const STEPS: MacroStep[] = [
  {
    key: "install",
    label: "App Download",
    desc: "Friend installed the app and registered with your code",
    cta: "Help them download the app",
    requires: ["registered"],
  },
  {
    key: "request",
    label: "First Service Request",
    desc: "They raised their first plumber / carpenter / electrician request",
    cta: "Nudge them to raise their first request",
    requires: ["first_order_placed"],
  },
  {
    key: "vendor",
    label: "Joined as Vendor",
    desc: "Submitted business info & completed Razorpay activation payment",
    cta: "Remind them to complete vendor payment",
    requires: ["became_seller", "payment_completed"],
  },
];

function isStepDone(row: ReferralRow, step: MacroStep) {
  return step.requires.every((k) => row.progress[k]);
}

function FlipReferralCard({ row, onDetails, shareText, baseReward }: { row: ReferralRow; onDetails: () => void; shareText: string; baseReward: number }) {
  const [flipped, setFlipped] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // Coin sound + celebration on reward release
  const lastReleased = useRef<boolean>(row.progress.reward_released);
  useEffect(() => {
    if (!lastReleased.current && row.progress.reward_released) {
      playCoinDrop();
      setCelebrate(true);
      toast.success(`+₹${baseReward} added to your wallet — from ${row.name ?? "your friend"}! 🎉`, { duration: 4500 });
      const t = setTimeout(() => setCelebrate(false), 2800);
      return () => clearTimeout(t);
    }
    lastReleased.current = row.progress.reward_released;
  }, [row.progress.reward_released, row.name, baseReward]);

  return (
    <div className="relative" style={{ perspective: 1200 }}>
      <motion.div
        className="relative w-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* FRONT */}
        <div style={{ backfaceVisibility: "hidden" }}>
          <CardFront row={row} onOpenSheet={onDetails} onFlip={() => setFlipped(true)} shareText={shareText} baseReward={baseReward} celebrate={celebrate} />
        </div>
        {/* BACK */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <CardBack row={row} onFlip={() => setFlipped(false)} onDetails={onDetails} />
        </div>
      </motion.div>
    </div>
  );
}

function CardFront({ row, onOpenSheet, onFlip, shareText, baseReward, celebrate }: { row: ReferralRow; onOpenSheet: () => void; onFlip: () => void; shareText: string; baseReward: number; celebrate: boolean }) {
  const initials = (row.name ?? "U").slice(0, 1).toUpperCase();
  const completed = STEPS.filter((s) => isStepDone(row, s)).length;
  const pct = Math.round((completed / STEPS.length) * 100);
  const released = row.progress.reward_released;
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
  const handleFlip = (e: React.MouseEvent) => { e.stopPropagation(); onFlip(); };

  return (
    <button onClick={onOpenSheet} className="relative w-full text-left rounded-2xl bg-white border border-amber-200 p-3 shadow-sm active:scale-[0.99] transition overflow-hidden">
      {/* Corner flip button */}
      <button
        onClick={handleFlip}
        aria-label="Flip card"
        className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-amber-50 border border-amber-200 grid place-items-center text-amber-700 active:scale-90"
      >
        <Repeat className="h-3.5 w-3.5" />
      </button>

      {/* Celebration burst when reward releases */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-20 grid place-items-center bg-gradient-to-br from-emerald-500/95 to-amber-500/95 text-white pointer-events-none"
          >
            <div className="text-center">
              <Sparkles className="h-10 w-10 mx-auto" />
              <p className="font-display text-2xl font-extrabold mt-1">+₹{baseReward}</p>
              <p className="text-[10px] uppercase tracking-widest font-bold">Reward unlocked!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 pr-8">
        <div className="relative h-11 w-11 rounded-full overflow-hidden border border-amber-200 bg-amber-50 grid place-items-center text-amber-700 font-bold flex-shrink-0">
          {row.avatar_url ? <img src={row.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${statusColor} border-2 border-white`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800 truncate">{row.name ?? "New user"}</p>
          <p className="text-[11px] text-slate-500 truncate">{row.phone ?? "Phone hidden"}</p>
        </div>
        {/* Big ₹ amount pill in place of "PENDING" tag */}
        <div className={`text-right ${released ? "" : "opacity-90"}`}>
          <p className={`text-[9px] uppercase tracking-wider font-bold ${released ? "text-emerald-700" : "text-amber-700"}`}>
            {released ? "Earned" : "On unlock"}
          </p>
          <p className={`font-display text-xl font-extrabold leading-none mt-0.5 ${released ? "text-emerald-600" : "text-amber-600"}`}>
            ₹{baseReward}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] mb-2">
          <span className="text-slate-500 font-semibold">{completed}/3 milestones</span>
          <span className={`font-bold ${released ? "text-emerald-600" : "text-amber-700"}`}>{pct}%</span>
        </div>
        <div className="relative flex items-center justify-between">
          <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 rounded-full bg-amber-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-600"
            />
          </div>
          {STEPS.map((s, i) => {
            const done = isStepDone(row, s);
            const next = !done && STEPS.slice(0, i).every((p) => isStepDone(row, p));
            return (
              <motion.div
                key={s.key}
                initial={false}
                animate={done ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
                className={`relative z-10 h-7 w-7 rounded-full grid place-items-center border-2 ${
                  done ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-300"
                    : next ? "bg-amber-50 border-amber-400 text-amber-700 animate-pulse"
                    : "bg-white border-slate-200 text-slate-400"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Clock className="h-3.5 w-3.5" />}
              </motion.div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-1 mt-1.5">
          {STEPS.map((s) => (
            <p key={s.key} className="text-[9px] text-center text-slate-500 font-semibold leading-tight">{s.label}</p>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <span onClick={callCustomer} role="button" className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95">
          <Phone className="h-3.5 w-3.5" /> Call
        </span>
        <span onClick={nudgeWhatsApp} role="button" className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </span>
      </div>
      <p className="text-center mt-2 text-[10px] text-amber-700/70 font-semibold">Tap card for full timeline · tap ↻ to see downline</p>
    </button>
  );
}

function CardBack({ row, onFlip, onDetails }: { row: ReferralRow; onFlip: () => void; onDetails: () => void }) {
  const initials = (row.name ?? "U").slice(0, 1).toUpperCase();
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1c1917] via-[#3a2410] to-[#451a03] text-white border border-amber-600/30 p-3 shadow-lg h-full">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-amber-400/40 bg-amber-50 grid place-items-center text-amber-700 font-bold flex-shrink-0">
          {row.avatar_url ? <img src={row.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{row.name ?? "New user"}</p>
          <p className="text-[11px] opacity-70 truncate">Their network</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onFlip(); }} className="h-7 w-7 rounded-full bg-white/10 grid place-items-center active:scale-95">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 rounded-xl bg-white/5 border border-amber-400/20 p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-400/15 grid place-items-center">
          <Users className="h-5 w-5 text-amber-300" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Sub-referrals</p>
          <p className="font-display text-xl font-bold text-amber-300">{row.downline_count} people</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold">From downline</p>
          <p className="font-display text-lg font-bold text-emerald-300">+₹{Number(row.downline_earnings).toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 max-h-[120px] overflow-y-auto">
        {row.downline.length === 0 && (
          <p className="text-[11px] opacity-60 text-center py-3">No sub-referrals yet</p>
        )}
        {row.downline.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] bg-white/5 rounded-lg px-2 py-1.5 border border-white/5">
            <span className={`h-1.5 w-1.5 rounded-full ${d.status === "approved" ? "bg-emerald-400" : d.status === "rejected" ? "bg-rose-400" : "bg-amber-400"}`} />
            <span className="flex-1 truncate">{d.name ?? d.phone ?? "User"}</span>
            <span className="text-[9px] uppercase tracking-wider opacity-60">{d.status}</span>
          </div>
        ))}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDetails(); }}
        className="mt-3 w-full rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold py-2 active:scale-95"
      >
        View full milestone timeline →
      </button>
    </div>
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
          <p className="font-display text-xl font-bold text-amber-800">activation payout</p>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${row.progress.reward_released ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"}`}>
          {row.progress.reward_released ? "Released" : "Locked"}
        </span>
      </div>

      <ol className="relative border-l-2 border-dashed border-amber-200 pl-5 space-y-5">
        {STEPS.map((s, i) => {
          const done = isStepDone(row, s);
          const next = !done && STEPS.slice(0, i).every((p) => isStepDone(row, p));
          const stepNudge = () => {
            const text = `Hi${row.name ? " " + row.name : ""}! 👋\n\n${s.cta} on Karo Online — you're just one step away from "${s.label}".\n\n${shareText}`;
            const phone = (row.phone ?? "").replace(/\D/g, "");
            window.open(
              phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`,
              "_blank",
              "noopener,noreferrer",
            );
          };
          return (
            <li key={s.key} className="relative">
              <motion.span
                initial={false}
                animate={done ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{ duration: 0.6 }}
                className={`absolute -left-[30px] top-0 h-7 w-7 rounded-full grid place-items-center border-2 text-xs font-bold ${
                  done ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-300"
                    : next ? "bg-amber-100 border-amber-400 text-amber-700 animate-pulse"
                    : "bg-white border-slate-200 text-slate-300"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </motion.span>
              <p className={`text-sm font-bold ${done ? "text-slate-800" : next ? "text-amber-700" : "text-slate-400"}`}>{s.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
              {!done && (
                <button
                  onClick={stepNudge}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-semibold px-2.5 py-1.5 active:scale-95 shadow"
                >
                  <MessageCircle className="h-3 w-3" /> WhatsApp nudge
                </button>
              )}
            </li>
          );
        })}
      </ol>

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

function WithdrawSheet({ available, onClose }: { available: number; onClose: () => void }) {
  const router = useRouter();
  const { profile } = useAuth();
  const [amount, setAmount] = useState<string>(String(Math.floor(available)));
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [busy, setBusy] = useState(false);

  // KYC gate: customer profile must be verified
  const kycOk = !!profile?.id && !!profile?.phone;

  const submit = async () => {
    const amt = Number(amount || 0);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > available) return toast.error("Amount exceeds wallet balance");
    if (!/^\d{9,18}$/.test(account)) return toast.error("Enter a valid bank account number");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) return toast.error("Invalid IFSC code");

    setBusy(true);
    try {
      // Record the withdrawal request as a notification for admin review.
      const { error } = await supabase.from("admin_notifications").insert({
        kind: "withdrawal_request",
        title: "Referral wallet withdrawal request",
        body: `₹${amt} → A/C ${account} · IFSC ${ifsc.toUpperCase()}`,
        meta: { amount: amt, account, ifsc: ifsc.toUpperCase(), user_id: profile?.user_id } as any,
      } as any);
      if (error) throw error;
      toast.success("Withdrawal requested. Our team will process it within 24 hrs.");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 pt-5 pb-8">
      <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 mb-4" />
      <SheetHeader>
        <SheetTitle className="font-display text-xl text-slate-800">Withdraw to Bank</SheetTitle>
      </SheetHeader>

      <div className="mt-3 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-4">
        <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700">Available</p>
        <p className="font-display text-3xl font-bold text-amber-800 mt-1">₹{available.toLocaleString()}</p>
      </div>

      {!kycOk ? (
        <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-4">
          <p className="text-sm font-bold text-rose-700">Complete KYC first</p>
          <p className="text-xs text-rose-600 mt-1">You need to verify your KYC before requesting a withdrawal.</p>
          <button onClick={() => { onClose(); router.navigate({ to: "/vendor/kyc" }); }} className="mt-3 w-full rounded-xl bg-rose-500 text-white py-2.5 text-sm font-bold active:scale-95">
            Go to KYC
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Amount (₹)</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border-2 border-amber-200 bg-white px-3 py-2.5 font-semibold text-slate-800 focus:border-amber-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Bank Account Number</span>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="e.g. 1234567890"
              className="mt-1 w-full rounded-xl border-2 border-amber-200 bg-white px-3 py-2.5 font-semibold text-slate-800 focus:border-amber-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">IFSC Code</span>
            <input
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase())}
              placeholder="e.g. HDFC0001234"
              className="mt-1 w-full rounded-xl border-2 border-amber-200 bg-white px-3 py-2.5 font-semibold text-slate-800 font-mono uppercase focus:border-amber-400 focus:outline-none"
            />
          </label>
          <button
            onClick={submit}
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b45309] text-[#1a1208] py-3 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-amber-900/30 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {busy ? "Submitting…" : "Request withdrawal"}
          </button>
          <p className="text-[10px] text-slate-500 text-center">Withdrawals are reviewed by our team and credited within 24 hours.</p>
        </div>
      )}
    </div>
  );
}
