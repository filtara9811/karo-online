import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote, CheckCircle2, Clock, ShieldCheck, Store, Sparkles,
  ChevronRight, Loader2, Download, X, Lock, FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReferralOverview } from "@/hooks/use-referral";
import { openRazorpayCheckout } from "@/lib/razorpay-client";
import {
  createInfluencerActivationOrder,
  verifyInfluencerActivation,
} from "@/lib/referral-activation.functions";
import { KycStepFlow } from "@/components/KycStepFlow";
import { AnimatePresence } from "framer-motion";

/**
 * Premium 2-step Withdraw Gate.
 *
 * Step 1 — KYC Gate: must be completed via the full /KycStepFlow first
 *   (selfie + aadhaar + PAN + bank). If anything is missing we lock the
 *   sheet and open the KYC flow on tap. PAN + bank values are auto-filled
 *   from the existing KYC records — the user never re-types them.
 * Step 2 — Account Activation: requires the user to be a paid vendor OR
 *   a paid influencer / part-time partner.
 */
export function WithdrawGateSheet({
  open,
  onOpenChange,
  available,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  available: number;
}) {
  const router = useRouter();
  const { profile } = useAuth();
  const { data, refresh } = useReferralOverview();
  const createOrder = useServerFn(createInfluencerActivationOrder);
  const verifyOrder = useServerFn(verifyInfluencerActivation);

  const [amount, setAmount] = useState<string>(() => String(Math.floor(available || 0)));
  const [busy, setBusy] = useState(false);
  const [activating, setActivating] = useState(false);
  const [showKyc, setShowKyc] = useState(false);

  // KYC status fetched from server — drives the gate.
  type KycStatus = {
    ok: boolean;
    selfie_ok: boolean;
    aadhaar_ok: boolean;
    pan_ok: boolean;
    bank_ok: boolean;
    pan_number?: string | null;
    bank?: { holder?: string; account_number?: string; ifsc?: string; upi?: string } | null;
  };
  const [kyc, setKyc] = useState<KycStatus | null>(null);

  const loadKyc = useCallback(async () => {
    const { data: res } = await supabase.rpc("get_my_kyc_status" as never);
    setKyc((res as KycStatus) ?? null);
  }, []);

  useEffect(() => { if (open) loadKyc(); }, [open, loadKyc]);

  const isActivated = !!data?.activation?.is_activated;
  const partnerKind = data?.activation?.partner_kind ?? null;
  const influencerFee = data?.settings.influencer_activation_fee ?? 499;
  const vendorFee = data?.settings.activation_fee ?? 1000;

  const kycComplete = !!kyc && kyc.selfie_ok && kyc.aadhaar_ok && kyc.pan_ok && kyc.bank_ok;
  const pan = (kyc?.pan_number ?? "").toUpperCase();
  const account = (kyc?.bank?.account_number ?? "");
  const ifsc = (kyc?.bank?.ifsc ?? "").toUpperCase();

  const canWithdraw = kycComplete && isActivated;

  const submit = async () => {
    if (!kycComplete) {
      toast.error("Please complete KYC first");
      setShowKyc(true);
      return;
    }
    if (!isActivated) return toast.error("Activate your account first");
    const amt = Number(amount || 0);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > available) return toast.error("Amount exceeds wallet balance");

    setBusy(true);
    try {
      const { error } = await supabase.from("admin_notifications").insert({
        kind: "withdrawal_request",
        title: "Referral wallet withdrawal request",
        body: `₹${amt} → A/C ${account} · IFSC ${ifsc} · PAN ${pan}`,
        meta: {
          amount: amt,
          account,
          ifsc,
          pan,
          user_id: profile?.user_id,
          partner_kind: partnerKind,
        },
      } as never);
      if (error) throw error;
      toast.success("Withdrawal requested. Credited within 24 hrs.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  const goVendorWizard = () => {
    onOpenChange(false);
    setTimeout(() => router.navigate({ to: "/vendor/register" }), 200);
  };

  const payInfluencer = async () => {
    setActivating(true);
    try {
      const order = await createOrder({});
      if (!order.ok) { toast.error(order.error); return; }
      const resp = await openRazorpayCheckout({
        key_id: order.key_id, order_id: order.order_id, amount: order.amount,
        name: "Karo Online · Influencer Partner",
        description: `Activation · ₹${order.amount_inr}`,
        prefill: { name: profile?.name ?? undefined, contact: profile?.phone ?? undefined },
      });
      const verify = await verifyOrder({
        data: {
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature: resp.razorpay_signature,
          amount_inr: order.amount_inr,
        },
      });
      if (!verify.ok) { toast.error(verify.error); return; }
      toast.success("You're activated as a Digital Influencer! 🎉");
      await refresh();
    } catch (e) {
      const msg = (e as Error)?.message ?? "";
      if (msg.toLowerCase().includes("cancel")) return;
      toast.error(msg || "Payment failed");
    } finally {
      setActivating(false);
    }
  };

  const checklist = useMemo(() => ([
    { key: "selfie", label: "Selfie", ok: !!kyc?.selfie_ok },
    { key: "aadhaar", label: "Aadhaar", ok: !!kyc?.aadhaar_ok },
    { key: "pan", label: "PAN Card", ok: !!kyc?.pan_ok },
    { key: "bank", label: "Bank Account", ok: !!kyc?.bank_ok },
  ]), [kyc]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl p-0 max-h-[92vh] overflow-y-auto bg-gradient-to-b from-[#fdf6e3] via-[#f4e9c8] to-[#fdf6e3] border-t-2 border-[#d4af37]"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-[#fdf6e3]/95 backdrop-blur border-b border-[#d4af37]/30">
            <div>
              <h2 className="font-display text-lg font-bold text-[#1a1208]">Withdraw to Bank</h2>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8b6508]">2-step secure payout</p>
            </div>
            <button onClick={() => onOpenChange(false)} aria-label="Close" className="h-9 w-9 grid place-items-center rounded-full bg-white/80 text-[#1a1208] border border-[#d4af37]/40">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 pt-4 pb-8 space-y-4">
            {/* Available */}
            <div className="rounded-2xl bg-gradient-to-br from-[#1a1208] via-[#2a1f10] to-[#3d2a14] border border-[#d4af37]/40 p-4 shadow-[0_10px_28px_-12px_rgba(212,175,55,0.55)]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#d4af37]/80 font-bold">Available to withdraw</p>
              <p className="font-display text-3xl font-bold text-[#fff8dc] mt-1" style={{ textShadow: "0 1px 8px rgba(212,175,55,0.55)" }}>
                ₹{available.toLocaleString()}
              </p>
            </div>

            {/* STEP 1 — KYC Gate */}
            <StepCard n={1} title="KYC Verification" subtitle="Selfie · Aadhaar · PAN · Bank" done={kycComplete}>
              {kycComplete ? (
                <div className="space-y-2">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3 flex items-center gap-3">
                    <FileCheck2 className="h-5 w-5 text-emerald-600" />
                    <div className="text-[12px] text-emerald-800">
                      <p className="font-bold">KYC verified · payouts pre-filled</p>
                      <p>PAN <span className="font-mono">{pan}</span> · A/C <span className="font-mono">…{account.slice(-4)}</span> · IFSC <span className="font-mono">{ifsc}</span></p>
                    </div>
                  </div>
                  <AmountField value={amount} onChange={setAmount} />
                </div>
              ) : (
                <div className="space-y-3">
                  <ul className="space-y-1.5">
                    {checklist.map((c) => (
                      <li key={c.key} className="flex items-center gap-2 text-[12px]">
                        {c.ok
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          : <Clock className="h-4 w-4 text-amber-600" />}
                        <span className={c.ok ? "text-emerald-800 font-bold" : "text-[#1a1208]"}>{c.label}</span>
                        <span className={`ml-auto text-[10px] uppercase tracking-wider font-bold ${c.ok ? "text-emerald-600" : "text-amber-700"}`}>
                          {c.ok ? "Done" : "Pending"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setShowKyc(true)}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#f5d97a] via-[#d4af37] to-[#b45309] text-[#1a1208] py-3 font-bold text-sm flex items-center justify-center gap-2 active:scale-95"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Complete KYC to unlock withdrawal
                  </button>
                </div>
              )}
            </StepCard>

            {/* STEP 2 — Activation */}
            <StepCard n={2} title="Account Activation" subtitle="Vendor or Digital Influencer Partner" done={isActivated} locked={!kycComplete}>
              {isActivated ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Activated as {partnerKind === "influencer" ? "Digital Influencer" : "Professional Vendor"}</p>
                    <p className="text-[11px] text-emerald-700">Payouts unlocked. You can withdraw any time.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 flex items-start gap-3">
                    <Clock className="h-4 w-4 text-amber-700 mt-0.5" />
                    <p className="text-[11px] text-amber-800">Pending. Pick one path below to activate your account &amp; unlock withdrawals.</p>
                  </div>
                  <ActivationCta Icon={Store} title="Join as Professional Vendor" price={`₹${vendorFee}`} tag="Full shop + lead inbox" onClick={goVendorWizard} tone="gold" />
                  <ActivationCta Icon={Sparkles} title="Join as Digital Influencer / Part-Time Partner" price={`₹${influencerFee}`} tag="Light-weight · Referral payouts only" onClick={payInfluencer} tone="emerald" loading={activating} />
                </div>
              )}
            </StepCard>

            <button
              onClick={submit}
              disabled={!canWithdraw || busy}
              className="w-full rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#b45309] text-[#1a1208] py-3.5 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-amber-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : canWithdraw ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {busy ? "Submitting…" : canWithdraw ? "Request Withdrawal" : !kycComplete ? "Complete KYC to continue" : "Activate account to continue"}
            </button>

            <p className="text-[10px] text-center text-[#8b6508]/80 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Withdrawals are reviewed by our team and credited within 24 hours.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <AnimatePresence>
        {showKyc && (
          <KycStepFlow
            subjectType="customer"
            onClose={async () => { setShowKyc(false); await loadKyc(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------------- Subcomponents ---------------- */

const AmountField = memo(function AmountField({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#8b6508]">Amount (₹)</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        className="mt-1 w-full rounded-xl border-2 border-[#d4af37]/40 bg-white px-3 py-2.5 font-bold text-[#1a1208] focus:border-[#d4af37] focus:outline-none"
      />
    </label>
  );
});

function StepCard({
  n, title, subtitle, done, locked = false, children,
}: {
  n: number; title: string; subtitle: string; done: boolean; locked?: boolean; children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border-2 p-4 transition ${
        done ? "border-emerald-400/60 bg-white"
          : locked ? "border-[#d4af37]/20 bg-white/50 opacity-60"
          : "border-[#d4af37]/50 bg-white"
      }`}
    >
      <header className="flex items-center gap-3 mb-3">
        <div className={`h-8 w-8 rounded-full grid place-items-center font-bold text-sm ${
          done ? "bg-emerald-500 text-white" : locked ? "bg-slate-200 text-slate-500" : "bg-gradient-to-br from-[#f5d97a] to-[#b45309] text-[#1a1208]"
        }`}>
          {done ? <CheckCircle2 className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : n}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-bold text-[#1a1208] leading-tight">{title}</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#8b6508]">{subtitle}</p>
        </div>
        {done && <Banknote className="h-4 w-4 text-emerald-600" />}
      </header>
      {!locked && <div>{children}</div>}
    </section>
  );
}

function ActivationCta({
  Icon, title, price, tag, onClick, tone, loading,
}: {
  Icon: typeof Store; title: string; price: string; tag: string;
  onClick: () => void; tone: "gold" | "emerald"; loading?: boolean;
}) {
  const bg = tone === "gold"
    ? "bg-gradient-to-r from-[#f5d97a] via-[#d4af37] to-[#b45309] text-[#1a1208]"
    : "bg-gradient-to-r from-emerald-500 to-emerald-700 text-white";
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 shadow active:scale-[0.98] disabled:opacity-70 ${bg}`}>
      <div className="h-10 w-10 rounded-xl bg-black/15 grid place-items-center">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-bold text-sm leading-tight truncate">{title}</p>
        <p className="text-[10px] opacity-80 mt-0.5">{tag}</p>
      </div>
      <div className="flex flex-col items-end">
        <span className="font-display font-bold text-base">{price}</span>
        <ChevronRight className="h-4 w-4 opacity-80" />
      </div>
    </button>
  );
}
