import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Phone, MessageCircle, Store, CheckCircle2, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendOtp, verifyOtp } from "@/lib/otp.functions";
import { getVisitFp } from "@/lib/visit-fp";
import { toast } from "sonner";

export const Route = createFileRoute("/q/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Scan ${params.code} — Karo Online` },
      { name: "description", content: "Open this verified shop on Karo Online." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: QrLandingPage,
});

type Vendor = {
  id: string;
  business_name: string | null;
  owner_name: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  trade: string | null;
  is_online: boolean | null;
};

type Resolved =
  | { found: false }
  | { found: true; linked: false; code: string }
  | { found: true; linked: true; code: string; vendor: Vendor };

const COOKIE_KEY = "ko_cust_mobile";

function QrLandingPage() {
  const { code } = Route.useParams();
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [identity, setIdentity] = useState<{ name?: string; mobile?: string } | null>(null);
  const [visitInfo, setVisitInfo] = useState<{ visit_count: number; is_returning: boolean } | null>(null);
  const [showOtpSheet, setShowOtpSheet] = useState(false);

  const callSendOtp = useServerFn(sendOtp);
  const callVerifyOtp = useServerFn(verifyOtp);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("resolve_qr", { p_code: code });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setResolved({ found: false });
        return;
      }
      setResolved(data as Resolved);

      // If linked, try silent recognition by device fingerprint
      if ((data as any)?.linked) {
        const fp = getVisitFp();
        const { data: rec } = await supabase.rpc("recognize_customer_by_fp", {
          p_device_fp: fp,
        });
        const recObj = rec as { found: boolean; name?: string; mobile?: string };
        if (recObj?.found && recObj.mobile) {
          setIdentity({ name: recObj.name, mobile: recObj.mobile });
          // Silent visit record
          const { data: visit } = await supabase.rpc("record_customer_visit", {
            p_code: code,
            p_mobile: recObj.mobile,
            p_name: recObj.name ?? "",
            p_device_fp: fp,
            p_source_kind: "stand",
          });
          const v = visit as { visit_count?: number; is_returning?: boolean };
          if (v) setVisitInfo({ visit_count: v.visit_count ?? 1, is_returning: !!v.is_returning });
        } else {
          setShowOtpSheet(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const onVerified = useCallback(
    async (name: string, mobile: string) => {
      const fp = getVisitFp();
      const { data, error } = await supabase.rpc("record_customer_visit", {
        p_code: code,
        p_mobile: mobile,
        p_name: name,
        p_device_fp: fp,
        p_source_kind: "stand",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const v = data as { visit_count?: number; is_returning?: boolean };
      setVisitInfo({ visit_count: v.visit_count ?? 1, is_returning: !!v.is_returning });
      setIdentity({ name, mobile });
      try {
        document.cookie = `${COOKIE_KEY}=${encodeURIComponent(mobile)};path=/;max-age=${
          60 * 60 * 24 * 365
        }`;
      } catch {}
      setShowOtpSheet(false);
    },
    [code],
  );

  if (!resolved) {
    return (
      <div className="min-h-screen grid place-items-center bg-amber-50">
        <Loader2 className="h-7 w-7 animate-spin text-amber-700" />
      </div>
    );
  }

  if (!resolved.found) {
    return (
      <div className="min-h-screen grid place-items-center bg-amber-50 p-6 text-center">
        <div>
          <QrCode className="h-12 w-12 mx-auto mb-3 text-amber-700" />
          <h1 className="text-xl font-bold text-slate-800">QR not recognised</h1>
          <p className="text-sm text-slate-600 mt-1">
            This QR code is not registered with Karo Online.
          </p>
          <p className="text-[11px] text-slate-500 mt-2">Code: {code}</p>
        </div>
      </div>
    );
  }

  if (resolved.found && !resolved.linked) {
    return <UnlinkedView code={resolved.code} />;
  }

  const vendor = resolved.vendor;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-md mx-auto px-4 py-8">
        {visitInfo && (
          <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            <div>
              <p className="text-sm font-bold text-emerald-900">
                {visitInfo.is_returning
                  ? `Welcome back${identity?.name ? `, ${identity.name}` : ""}!`
                  : `Welcome${identity?.name ? `, ${identity.name}` : ""}!`}
              </p>
              <p className="text-[11px] text-emerald-800">
                Visit #{visitInfo.visit_count}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-3xl bg-white border border-amber-200 shadow-sm p-6 text-center">
          <div className="mx-auto h-20 w-20 rounded-full grid place-items-center bg-amber-100 border-2 border-amber-300 overflow-hidden">
            {vendor.avatar_url ? (
              <img src={vendor.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-9 w-9 text-amber-700" />
            )}
          </div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">
            {vendor.business_name || vendor.owner_name || "Shop"}
          </h1>
          {vendor.trade && (
            <p className="text-xs text-slate-500 mt-1">{vendor.trade}</p>
          )}
          {vendor.is_online && (
            <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online now
            </span>
          )}

          <div className="grid grid-cols-2 gap-2 mt-5">
            {vendor.whatsapp && (
              <a
                href={`tel:${vendor.whatsapp}`}
                className="rounded-xl bg-amber-100 border border-amber-300 py-2.5 text-xs font-bold text-amber-900 inline-flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            )}
            {vendor.whatsapp && (
              <a
                href={`https://wa.me/91${vendor.whatsapp.replace(/\D/g, "").slice(-10)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-emerald-500 text-white py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
          </div>

          <Link
            to="/home"
            className="block mt-3 rounded-xl border border-amber-300 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-50"
          >
            Open Karo Online
          </Link>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-4">
          QR: {resolved.code}
        </p>
      </div>

      {showOtpSheet && (
        <CustomerOtpSheet
          callSendOtp={callSendOtp as any}
          callVerifyOtp={callVerifyOtp as any}
          onVerified={onVerified}
          onSkip={() => setShowOtpSheet(false)}
        />
      )}
    </div>
  );
}

function UnlinkedView({ code }: { code: string }) {
  const [busy, setBusy] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: ses } = await supabase.auth.getSession();
      const uid = ses.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("vendors").select("id").eq("user_id", uid).maybeSingle();
      if (data?.id) setVendorId(data.id);
    })();
  }, []);

  const link = async () => {
    if (!vendorId) return;
    setBusy(true);
    const { error } = await supabase.rpc("link_qr_to_vendor", {
      p_code: code,
      p_vendor_id: vendorId,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("QR linked to your shop!");
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-amber-50 p-6">
      <div className="max-w-md w-full rounded-3xl bg-white border border-amber-300 p-6 text-center">
        <QrCode className="h-10 w-10 mx-auto text-amber-700 mb-3" />
        <h1 className="text-lg font-bold text-slate-900">QR not linked yet</h1>
        <p className="text-xs text-slate-600 mt-1">
          Code <span className="font-bold">{code}</span> is unassigned. Link it to your
          shop to start receiving visitors here.
        </p>
        {vendorId ? (
          <button
            onClick={link}
            disabled={busy || done}
            className="mt-5 w-full rounded-xl bg-amber-500 text-white py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {done ? "Linked!" : busy ? "Linking…" : "Link to my shop"}
          </button>
        ) : (
          <Link
            to="/vendor/register"
            className="mt-5 block rounded-xl bg-amber-500 text-white py-2.5 text-sm font-bold"
          >
            Register as Shop to claim
          </Link>
        )}
      </div>
    </div>
  );
}

function CustomerOtpSheet({
  callSendOtp,
  callVerifyOtp,
  onVerified,
  onSkip,
}: {
  callSendOtp: (args: { data: { phone: string } }) => Promise<any>;
  callVerifyOtp: (args: { data: { phone: string; code: string } }) => Promise<any>;
  onVerified: (name: string, mobile: string) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const requestOtp = async () => {
    if (name.trim().length < 2) return toast.error("Enter your name");
    const digits = mobile.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return toast.error("Enter 10-digit mobile");
    setBusy(true);
    try {
      const r = await callSendOtp({ data: { phone: digits } });
      if (!r.ok) {
        toast.error(r.error || "Could not send OTP");
        return;
      }
      setStep("otp");
      toast.success("OTP sent");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    const digits = mobile.replace(/\D/g, "").slice(-10);
    if (otp.length < 4) return toast.error("Enter OTP");
    setBusy(true);
    try {
      const r = await callVerifyOtp({ data: { phone: digits, code: otp } });
      if (!r.ok) {
        toast.error(r.error || "Wrong OTP");
        return;
      }
      onVerified(name.trim(), digits);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
      <div className="w-full bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-auto">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {step === "details" ? "Welcome to the shop" : "Verify your number"}
        </h2>
        <p className="text-xs text-slate-600 mb-4">
          {step === "details"
            ? "Let the shop know who's visiting."
            : `OTP sent to ${mobile}`}
        </p>

        {step === "details" ? (
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm"
            />
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Mobile number"
              inputMode="numeric"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm tracking-wider"
            />
            <button
              onClick={requestOtp}
              disabled={busy}
              className="w-full rounded-xl bg-amber-500 text-white py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter OTP"
              inputMode="numeric"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-center text-lg tracking-[0.5em]"
            />
            <button
              onClick={verify}
              disabled={busy}
              className="w-full rounded-xl bg-amber-500 text-white py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
            <button
              onClick={() => setStep("details")}
              className="w-full text-xs text-slate-500 py-2"
            >
              Change number
            </button>
          </div>
        )}

        <button
          onClick={onSkip}
          className="w-full mt-3 text-[11px] text-slate-400 py-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
