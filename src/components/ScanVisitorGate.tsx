import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User, Phone, ShieldCheck, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getVisitFp } from "@/lib/visit-fp";
import { recognizeVisitor } from "@/lib/qr-track";


/**
 * ScanVisitorGate — popup shown when someone opens a QR / referral landing page.
 * Captures visitor name + mobile, then logs the visit so every scan is counted
 * for the referral code owner.
 */
export function ScanVisitorGate({
  code,
  source = "qr",
  project,
  onDone,
}: {
  code: string;
  source?: "qr" | "link" | "card";
  project?: string | null;
  onDone?: () => void;
}) {
  const storageKey = `ko-scan-visitor:${source}:${code}`;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!code) return;
    let already = false;
    try { already = !!window.sessionStorage.getItem(storageKey); } catch { /* ignore */ }
    if (already) { onDone?.(); return; }

    let cancelled = false;
    let timer = 0;
    (async () => {
      // Returning customer on this device → no form, details already known.
      const known = await recognizeVisitor();
      if (cancelled) return;
      if (known?.mobile) {
        await supabase.rpc("log_referral_visit_lead" as never, {
          _code: code,
          _source: source,
          _name: known.name ?? "Karo customer",
          _phone: known.mobile,
          _fp_hash: getVisitFp(),
          _user_agent: navigator.userAgent,
          _project: project ?? null,
        } as never);
        if (cancelled) return;
        try { window.sessionStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
        toast.success(`Welcome back${known.name ? `, ${known.name}` : ""}!`);
        onDone?.();
        return;
      }
      timer = window.setTimeout(() => setOpen(true), 500);
    })();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, storageKey]);


  const close = (mark: boolean) => {
    if (mark) { try { window.sessionStorage.setItem(storageKey, "1"); } catch { /* ignore */ } }
    setOpen(false);
    onDone?.();
  };

  const submit = async () => {
    const digits = phone.replace(/\D/g, "");
    if (name.trim().length < 2) { toast.error("Apna naam likhein"); return; }
    if (digits.length < 10) { toast.error("10 digit mobile number likhein"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("log_referral_visit_lead" as never, {
      _code: code,
      _source: source,
      _name: name.trim(),
      _phone: digits.slice(-10),
      _fp_hash: getVisitFp(),
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      _project: project ?? null,
    } as never);
    setBusy(false);
    const res = data as { ok?: boolean } | null;
    if (error || !res?.ok) { toast.error("Save nahi hua, dubara try karein"); return; }
    setDone(true);
    toast.success("Dhanyavaad! Aapki detail save ho gayi");
    window.setTimeout(() => close(true), 900);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm grid place-items-end sm:place-items-center p-3"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#b45309] via-[#d97706] to-[#f59e0b] px-5 py-4 text-white">
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold opacity-90">Karo Online</p>
              <h2 className="font-display text-xl font-bold leading-tight mt-0.5">Aap kaun hain?</h2>
              <p className="text-[12px] opacity-90 mt-0.5">Naam aur mobile number dijiye — aapko best vendors se jodenge.</p>
            </div>

            <div className="p-5 space-y-3">
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-500">Your name</span>
                <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-amber-400">
                  <User className="h-4 w-4 text-amber-600 shrink-0" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 60))}
                    placeholder="Naam likhein"
                    className="flex-1 bg-transparent outline-none text-sm text-slate-900"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold text-slate-500">Mobile number</span>
                <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-amber-400">
                  <Phone className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-slate-500">+91</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric"
                    placeholder="10 digit number"
                    className="flex-1 bg-transparent outline-none text-sm text-slate-900 tracking-wide"
                  />
                </div>
              </label>

              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Aapka data safe hai · sirf contact ke liye
              </p>

              <button
                onClick={submit}
                disabled={busy || done}
                className="w-full rounded-2xl bg-gradient-to-r from-[#b45309] via-[#d4af37] to-[#f59e0b] text-white font-bold py-3.5 shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {done ? <Check className="h-5 w-5" /> : busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {done ? "Submitted" : busy ? "Saving…" : "Submit"}
              </button>
              <button
                onClick={() => close(false)}
                className="w-full text-center text-[12px] font-semibold text-slate-400 py-1"
              >
                Baad me
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
