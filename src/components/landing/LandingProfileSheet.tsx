import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { X, BadgeCheck, Phone, MapPin, Store, Download, ShieldCheck, UserPlus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getVisitFp } from "@/lib/visit-fp";
import { trackQrEvent } from "@/lib/qr-track";
import { needsLightText, shade } from "./landing-shared";


/**
 * Simple & sober merchant profile sheet with a downloadable QR of this page.
 */
export function LandingProfileSheet({
  open,
  onClose,
  accent,
  merchant,
  pageUrl,
  visitCode,
  project,

}: {
  open: boolean;
  onClose: () => void;
  accent: string;
  merchant: {
    name?: string;
    shop_name?: string;
    avatar_url?: string;
    verified?: boolean;
    phone?: string;
    address?: string;
    trade?: string;
    code?: string;
  };
  pageUrl: string;
  visitCode?: string;
  project?: string | null;
}) {

  const [qr, setQr] = useState<string>("");
  const name = merchant.shop_name || merchant.name || "Karo Online Merchant";
  const light = needsLightText(accent);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(pageUrl, { width: 640, margin: 1, color: { dark: "#111111", light: "#ffffff" } })
      .then((d) => !cancelled && setQr(d))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, pageUrl]);

  const download = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `${(merchant.code || name).replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.click();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white text-slate-900 shadow-2xl"
          >
            <div
              className="relative px-5 pb-6 pt-5"
              style={{ background: `linear-gradient(180deg, ${accent}, transparent 62%)` }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-slate-800 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center pt-2">
                <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg grid place-items-center text-3xl font-bold text-slate-700">
                  {merchant.avatar_url ? (
                    <img src={merchant.avatar_url} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    (name[0] ?? "K").toUpperCase()
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <h2 className="font-display text-xl font-bold" style={{ color: light ? "#ffffff" : "#1a1208" }}>
                    {name}
                  </h2>
                  {merchant.verified && <BadgeCheck className="h-5 w-5 text-emerald-600" />}
                </div>
                {merchant.trade && (
                  <p className="mt-0.5 text-xs" style={{ color: light ? "rgba(255,255,255,0.85)" : "#5b4a2a" }}>
                    {merchant.trade}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 px-5 pb-3">
              {merchant.phone && (
                <a
                  href={`tel:${merchant.phone}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 active:scale-[0.99]"
                >
                  <Phone className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-semibold">{merchant.phone}</span>
                </a>
              )}
              {merchant.address && (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <span className="text-sm text-slate-700">{merchant.address}</span>
                </div>
              )}
              {merchant.code && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <Store className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-700">
                    Shop code <span className="font-bold">{merchant.code}</span>
                  </span>
                </div>
              )}

              {visitCode && <MyDetailsCard accent={accent} code={visitCode} project={project ?? null} />}


              <div className="rounded-3xl border p-4 text-center" style={{ borderColor: accent }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: shade(accent, -0.25) }}>
                  Scan · Save · Share
                </p>
                <div className="mx-auto mt-3 w-44 rounded-2xl bg-white p-2 shadow-sm">
                  {qr ? (
                    <img src={qr} alt={`${name} QR code`} className="h-full w-full" />
                  ) : (
                    <div className="aspect-square w-full animate-pulse rounded-xl bg-slate-100" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={download}
                  disabled={!qr}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
                  style={{ background: accent, color: needsLightText(accent) ? "#ffffff" : "#1a1208" }}
                >
                  <Download className="h-4 w-4" /> Download QR
                </button>
              </div>

              <p className="flex items-center justify-center gap-1 pb-2 pt-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <ShieldCheck className="h-3 w-3" /> Verified on Karo Online
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Lets the visiting customer add their own details so the shop can reach them. */
function MyDetailsCard({ accent, code, project }: { accent: string; code: string; project: string | null }) {
  const [openForm, setOpenForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const fg = needsLightText(accent) ? "#ffffff" : "#1a1208";
  const field =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400";

  const save = async () => {
    const digits = phone.replace(/\D/g, "");
    if (name.trim().length < 2) { toast.error("Apna naam likhein"); return; }
    if (digits.length < 10) { toast.error("10 digit mobile number likhein"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("log_referral_visit_lead" as never, {
      _code: code,
      _source: "qr",
      _name: name.trim(),
      _phone: digits.slice(-10),
      _fp_hash: getVisitFp(),
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      _project: project,
    } as never);
    setBusy(false);
    const res = data as { ok?: boolean } | null;
    if (error || !res?.ok) { toast.error("Save nahi hua, dubara try karein"); return; }
    void trackQrEvent("CHAT", {
      code,
      project,
      meta: { kind: "customer_details", email: email.trim() || null, city: city.trim() || null, note: note.trim() || null },
    });
    setSaved(true);
    toast.success("Details saved — shop aapse contact karega");
  };

  if (saved) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <Check className="h-4 w-4 text-emerald-600" />
        <p className="text-sm font-semibold text-emerald-800">Your details are with the shop</p>
      </div>
    );
  }

  if (!openForm) {
    return (
      <button
        type="button"
        onClick={() => setOpenForm(true)}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold shadow active:scale-[0.99]"
        style={{ background: accent, color: fg }}
      >
        <UserPlus className="h-4 w-4" />
        <span className="min-w-0">
          <span className="block text-sm">Add my details</span>
          <span className="block text-[11px] font-medium opacity-80">Name, mobile & more — shop turant reply karega</span>
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border p-3" style={{ borderColor: accent }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: shade(accent, -0.25) }}>
        My details
      </p>
      <input className={field} placeholder="Your name*" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className={field}
        placeholder="Mobile number*"
        inputMode="numeric"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))}
      />
      <input className={field} placeholder="Email (optional)" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={field} placeholder="City / area (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
      <textarea className={field} rows={2} placeholder="What do you need? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold active:scale-95 disabled:opacity-60"
        style={{ background: accent, color: fg }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save details
      </button>
    </div>
  );
}
