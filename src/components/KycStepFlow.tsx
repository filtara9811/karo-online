import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Camera, IdCard, FileText, Building2, CheckCircle2,
  Upload, Loader2, ChevronRight, ChevronLeft, ShieldCheck, AtSign, User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type StepKey = "selfie" | "aadhaar" | "pan" | "bank";
type StepStatus = "todo" | "submitted" | "verified" | "rejected";

const STEPS: { key: StepKey; label: string; Icon: typeof Camera }[] = [
  { key: "selfie", label: "Selfie", Icon: Camera },
  { key: "aadhaar", label: "Aadhaar", Icon: IdCard },
  { key: "pan", label: "PAN", Icon: FileText },
  { key: "bank", label: "Bank", Icon: Building2 },
];

export function KycStepFlow({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Record<StepKey, StepStatus>>({
    selfie: "todo", aadhaar: "todo", pan: "todo", bank: "todo",
  });
  const [records, setRecords] = useState<Record<StepKey, any>>({
    selfie: null, aadhaar: null, pan: null, bank: null,
  });
  const [active, setActive] = useState<StepKey>("selfie");
  const [loading, setLoading] = useState(true);

  // Load existing
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("kyc_verifications")
        .select("*")
        .eq("subject_user_id", user.id)
        .in("check_type", ["selfie", "aadhaar", "pan", "bank"]);
      const st: Record<StepKey, StepStatus> = { selfie: "todo", aadhaar: "todo", pan: "todo", bank: "todo" };
      const rec: Record<StepKey, any> = { selfie: null, aadhaar: null, pan: null, bank: null };
      ((data ?? []) as any[]).forEach((r) => {
        const k = r.check_type as StepKey;
        if (!STEPS.find((s) => s.key === k)) return;
        const s = (r.status ?? "").toLowerCase();
        st[k] = ["verified", "approved", "passed"].includes(s)
          ? "verified"
          : s === "rejected"
          ? "rejected"
          : "submitted";
        rec[k] = r;
      });
      setStatuses(st);
      setRecords(rec);
      // Jump to first incomplete step
      const next = STEPS.find((s) => st[s.key] === "todo" || st[s.key] === "rejected");
      if (next) setActive(next.key);
      setLoading(false);
    })();
  }, [user?.id]);

  const completedCount = STEPS.filter((s) =>
    statuses[s.key] === "verified" || statuses[s.key] === "submitted",
  ).length;
  const overallPct = Math.round((completedCount / STEPS.length) * 100);
  const allVerified = STEPS.every((s) => statuses[s.key] === "verified");

  const upsertStep = async (
    key: StepKey,
    payload: { document_number?: string | null; document_urls?: string[]; request_payload?: any },
  ) => {
    if (!user?.id) throw new Error("Not signed in");
    const existing = records[key];
    const body: any = {
      subject_user_id: user.id,
      subject_type: "customer",
      check_type: key,
      method: "manual",
      status: "submitted",
      document_number: payload.document_number ?? null,
      document_urls: payload.document_urls ?? [],
      request_payload: payload.request_payload ?? {},
    };
    if (existing?.id) {
      const { error } = await supabase
        .from("kyc_verifications")
        .update(body)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("kyc_verifications")
        .insert(body)
        .select("*")
        .single();
      if (error) throw error;
      setRecords((p) => ({ ...p, [key]: data }));
    }
    setStatuses((p) => ({ ...p, [key]: "submitted" }));
  };

  const goNext = () => {
    const idx = STEPS.findIndex((s) => s.key === active);
    if (idx < STEPS.length - 1) setActive(STEPS[idx + 1].key);
  };
  const goPrev = () => {
    const idx = STEPS.findIndex((s) => s.key === active);
    if (idx > 0) setActive(STEPS[idx - 1].key);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto bg-gradient-to-b from-amber-50/80 to-white rounded-t-3xl max-h-[94vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur px-5 pt-3 pb-3 rounded-t-3xl border-b border-amber-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-amber-600" />
              <h3 className="font-display text-lg font-bold text-amber-700">KYC Verification</h3>
            </div>
            <button
              onClick={onClose} aria-label="Close"
              className="h-9 w-9 grid place-items-center rounded-full bg-slate-100 active:scale-90 transition"
            >
              <X className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          {/* Overall % */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 rounded-full bg-amber-100 overflow-hidden">
              <motion.div
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full rounded-full ${allVerified ? "bg-emerald-500" : "bg-gradient-to-r from-amber-400 to-amber-600"}`}
              />
            </div>
            <span className={`text-[11px] font-bold ${allVerified ? "text-emerald-600" : "text-amber-700"}`}>
              {overallPct}%{allVerified && " ✓ Verified"}
            </span>
          </div>

          {/* Stepper */}
          <div className="mt-4 flex items-center justify-between relative">
            <div className="absolute left-5 right-5 top-5 h-[2px] bg-amber-200 -z-0" />
            {STEPS.map((s) => {
              const st = statuses[s.key];
              const done = st === "verified" || st === "submitted";
              const isActive = active === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className="relative z-10 flex flex-col items-center gap-1"
                >
                  <motion.div
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    className={`h-10 w-10 rounded-full grid place-items-center border-2 transition ${
                      st === "verified"
                        ? "bg-emerald-500 border-emerald-600 text-white"
                        : st === "submitted"
                        ? "bg-amber-500 border-amber-600 text-white"
                        : st === "rejected"
                        ? "bg-rose-500 border-rose-600 text-white"
                        : isActive
                        ? "bg-white border-amber-500 text-amber-700 shadow-lg"
                        : "bg-amber-50 border-amber-200 text-amber-400"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <s.Icon className="h-5 w-5" />}
                  </motion.div>
                  <span className={`text-[10px] font-bold ${isActive ? "text-amber-700" : "text-slate-500"}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="py-16 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
              >
                {active === "selfie" && (
                  <SelfieStep
                    status={statuses.selfie}
                    record={records.selfie}
                    onSubmit={async (payload) => {
                      await upsertStep("selfie", payload);
                      toast.success("Selfie submitted");
                      goNext();
                    }}
                  />
                )}
                {active === "aadhaar" && (
                  <DocStep
                    title="Aadhaar Card"
                    description="Aadhaar number daalein aur Front + Back image upload karein."
                    numberLabel="Aadhaar Number"
                    placeholder="XXXX XXXX XXXX"
                    maxLength={14}
                    needs={["front", "back"]}
                    status={statuses.aadhaar}
                    record={records.aadhaar}
                    onSubmit={async (payload) => {
                      await upsertStep("aadhaar", payload);
                      toast.success("Aadhaar submitted");
                      goNext();
                    }}
                  />
                )}
                {active === "pan" && (
                  <DocStep
                    title="PAN Card"
                    description="PAN number daalein aur PAN card ki photo upload karein."
                    numberLabel="PAN Number"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    needs={["front"]}
                    upperCase
                    status={statuses.pan}
                    record={records.pan}
                    onSubmit={async (payload) => {
                      await upsertStep("pan", payload);
                      toast.success("PAN submitted");
                      goNext();
                    }}
                  />
                )}
                {active === "bank" && (
                  <BankStep
                    status={statuses.bank}
                    record={records.bank}
                    allOtherDone={STEPS.filter((s) => s.key !== "bank").every(
                      (s) => statuses[s.key] === "submitted" || statuses[s.key] === "verified",
                    )}
                    onSubmit={async (payload) => {
                      await upsertStep("bank", payload);
                      toast.success("Submitted for review");
                      onClose();
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Nav */}
          {!loading && (
            <div className="flex items-center justify-between mt-5 gap-2">
              <button
                onClick={goPrev}
                disabled={STEPS[0].key === active}
                className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold disabled:opacity-40 inline-flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={goNext}
                disabled={STEPS[STEPS.length - 1].key === active || statuses[active] === "todo"}
                className="px-3 py-2.5 rounded-xl bg-amber-100 text-amber-700 text-xs font-bold disabled:opacity-40 inline-flex items-center gap-1"
              >
                Skip / Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Helpers ---------------- */

async function uploadFile(userId: string, checkType: StepKey, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${checkType}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("kyc-documents").upload(path, file, {
    upsert: true, contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
}

function StatusPill({ status }: { status: StepStatus }) {
  if (status === "verified")
    return <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</span>;
  if (status === "submitted")
    return <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">Under Review</span>;
  if (status === "rejected")
    return <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-rose-100 text-rose-700">Rejected — Re-submit</span>;
  return <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">Pending</span>;
}

function InstructionBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900 leading-relaxed mb-4">
      {children}
    </div>
  );
}

/* ---------------- Step: Selfie ---------------- */
function SelfieStep({
  status, record, onSubmit,
}: { status: StepStatus; record: any; onSubmit: (p: { document_urls: string[]; request_payload: any }) => Promise<void> }) {
  const { user } = useAuth();
  const [first, setFirst] = useState((record?.request_payload?.first_name as string) ?? "");
  const [last, setLast] = useState((record?.request_payload?.last_name as string) ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    if (!first.trim() || !last.trim()) return toast.error("Name required");
    if (!file && !record?.document_urls?.length) return toast.error("Selfie required");
    if (!user?.id) return;
    setBusy(true);
    try {
      let urls: string[] = record?.document_urls ?? [];
      if (file) urls = [await uploadFile(user.id, "selfie", file)];
      await onSubmit({ document_urls: urls, request_payload: { first_name: first, last_name: last } });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display text-lg font-bold text-slate-800">Step 1 · Selfie</h4>
        <StatusPill status={status} />
      </div>
      <InstructionBox>
        Ek clear selfie lijiye — chehra frame ke center mein, achchi roshni mein. Glasses / mask na pehnein.
      </InstructionBox>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <input
          value={first} onChange={(e) => setFirst(e.target.value)}
          placeholder="First name"
          className="px-3 py-2.5 rounded-xl bg-amber-50/60 border border-amber-200 outline-none focus:border-amber-500 text-sm"
        />
        <input
          value={last} onChange={(e) => setLast(e.target.value)}
          placeholder="Last name"
          className="px-3 py-2.5 rounded-xl bg-amber-50/60 border border-amber-200 outline-none focus:border-amber-500 text-sm"
        />
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        className="relative rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/40 aspect-[3/4] grid place-items-center overflow-hidden cursor-pointer active:bg-amber-100/50"
      >
        {preview ? (
          <img src={preview} alt="selfie" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-amber-700">
            {/* Face outline guide */}
            <div className="h-40 w-32 rounded-[50%] border-4 border-dashed border-emerald-400/70 grid place-items-center">
              <Camera className="h-10 w-10 opacity-60" />
            </div>
            <p className="text-sm font-bold">Tap to open camera</p>
            <p className="text-[11px] text-slate-500">Face inside the oval, look straight</p>
          </div>
        )}
        <input
          ref={inputRef} type="file" accept="image/*" capture="user"
          className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>

      <button
        onClick={submit} disabled={busy}
        className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold shadow-lg active:scale-95 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {busy ? "Saving…" : "Save & Continue"}
      </button>
    </div>
  );
}

/* ---------------- Step: Aadhaar / PAN ---------------- */
function DocStep({
  title, description, numberLabel, placeholder, maxLength,
  needs, upperCase, status, record, onSubmit,
}: {
  title: string; description: string; numberLabel: string; placeholder: string;
  maxLength: number; needs: ("front" | "back")[]; upperCase?: boolean;
  status: StepStatus; record: any;
  onSubmit: (p: { document_number: string; document_urls: string[]; request_payload: any }) => Promise<void>;
}) {
  const { user } = useAuth();
  const [num, setNum] = useState((record?.document_number as string) ?? "");
  const [files, setFiles] = useState<Record<"front" | "back", File | null>>({ front: null, back: null });
  const [previews, setPreviews] = useState<Record<"front" | "back", string | null>>({
    front: record?.document_urls?.[0] ? null : null,
    back: record?.document_urls?.[1] ? null : null,
  });
  const [busy, setBusy] = useState(false);

  const pick = (side: "front" | "back", f: File | null) => {
    setFiles((p) => ({ ...p, [side]: f }));
    setPreviews((p) => ({ ...p, [side]: f ? URL.createObjectURL(f) : null }));
  };

  const submit = async () => {
    if (!num.trim() || num.replace(/\s/g, "").length < Math.min(maxLength - 4, 8))
      return toast.error("Valid number required");
    if (needs.some((side) => !files[side] && !(record?.document_urls?.length)))
      return toast.error("Upload required images");
    if (!user?.id) return;
    setBusy(true);
    try {
      const ck = title.toLowerCase().includes("pan") ? "pan" : "aadhaar";
      const urls: string[] = [];
      for (const side of needs) {
        if (files[side]) urls.push(await uploadFile(user.id, ck as StepKey, files[side]!));
      }
      const finalUrls = urls.length ? urls : (record?.document_urls ?? []);
      await onSubmit({
        document_number: num.trim(),
        document_urls: finalUrls,
        request_payload: { sides: needs },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display text-lg font-bold text-slate-800">{title}</h4>
        <StatusPill status={status} />
      </div>
      <InstructionBox>{description}</InstructionBox>

      <label className="text-[11px] uppercase tracking-wider text-slate-500 ml-1">{numberLabel}</label>
      <div className="relative mt-1 mb-4">
        <IdCard className="absolute left-3 top-3.5 h-5 w-5 text-amber-500" />
        <input
          value={num} maxLength={maxLength}
          onChange={(e) => setNum(upperCase ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-amber-50/60 border border-amber-200 focus:border-amber-500 outline-none tracking-wider font-mono text-sm"
        />
      </div>

      <div className={`grid ${needs.length > 1 ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
        {needs.map((side) => (
          <UploadTile
            key={side} label={side === "front" ? "Front Side" : "Back Side"}
            preview={previews[side]} hasExisting={!!record?.document_urls?.length && !files[side]}
            onPick={(f) => pick(side, f)}
          />
        ))}
      </div>

      <button
        onClick={submit} disabled={busy}
        className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold shadow-lg active:scale-95 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {busy ? "Saving…" : "Save & Continue"}
      </button>
    </div>
  );
}

function UploadTile({
  label, preview, hasExisting, onPick,
}: { label: string; preview: string | null; hasExisting: boolean; onPick: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 ml-1">{label}</p>
      <div
        onClick={() => ref.current?.click()}
        className="aspect-[4/3] rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 grid place-items-center overflow-hidden cursor-pointer active:bg-amber-100/50"
      >
        {preview ? (
          <img src={preview} className="w-full h-full object-cover" alt={label} />
        ) : hasExisting ? (
          <div className="flex flex-col items-center gap-1 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
            <p className="text-[10px] font-bold">Uploaded · tap to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-amber-700">
            <Upload className="h-7 w-7" />
            <p className="text-[10px] font-bold">Tap to capture</p>
            <p className="text-[9px] text-slate-500">Camera / Gallery</p>
          </div>
        )}
        <input
          ref={ref} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

/* ---------------- Step: Bank ---------------- */
function BankStep({
  status, record, allOtherDone, onSubmit,
}: {
  status: StepStatus; record: any; allOtherDone: boolean;
  onSubmit: (p: { document_number: string; document_urls: string[]; request_payload: any }) => Promise<void>;
}) {
  const rp = record?.request_payload ?? {};
  const [holder, setHolder] = useState(rp.holder ?? "");
  const [acc, setAcc] = useState(rp.account_number ?? "");
  const [confirm, setConfirm] = useState(rp.account_number ?? "");
  const [ifsc, setIfsc] = useState(rp.ifsc ?? "");
  const [upi, setUpi] = useState(rp.upi ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!holder.trim()) return toast.error("Account holder name required");
    if (!acc.trim() || acc !== confirm) return toast.error("Account numbers must match");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return toast.error("Valid IFSC required");
    setBusy(true);
    try {
      await onSubmit({
        document_number: acc.trim(),
        document_urls: [],
        request_payload: { holder, account_number: acc, ifsc, upi },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display text-lg font-bold text-slate-800">Step 4 · Bank Details</h4>
        <StatusPill status={status} />
      </div>
      <InstructionBox>
        Payout ke liye apna bank account jodein. Information secure rakhi jaati hai.
      </InstructionBox>

      <div className="space-y-3">
        <Field Icon={User} placeholder="Account holder name" value={holder} onChange={setHolder} />
        <Field Icon={Building2} placeholder="Account number" value={acc} onChange={setAcc} inputMode="numeric" />
        <Field Icon={Building2} placeholder="Confirm account number" value={confirm} onChange={setConfirm} inputMode="numeric" />
        <Field Icon={IdCard} placeholder="IFSC code (e.g. HDFC0001234)" value={ifsc} onChange={(v) => setIfsc(v.toUpperCase())} />
        <Field Icon={AtSign} placeholder="UPI ID (optional)" value={upi} onChange={setUpi} />
      </div>

      <button
        onClick={submit} disabled={busy || !allOtherDone}
        title={!allOtherDone ? "Complete previous steps first" : ""}
        className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold shadow-lg active:scale-95 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {busy ? "Submitting…" : "Submit for Review"}
      </button>
      {!allOtherDone && (
        <p className="mt-2 text-[11px] text-rose-600 text-center">
          Pehle Selfie, Aadhaar aur PAN complete karein.
        </p>
      )}
    </div>
  );
}

function Field({
  Icon, placeholder, value, onChange, inputMode,
}: { Icon: typeof User; placeholder: string; value: string; onChange: (v: string) => void; inputMode?: "numeric" | "text" }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-3.5 h-5 w-5 text-amber-500" />
      <input
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} inputMode={inputMode}
        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-amber-50/60 border border-amber-200 focus:border-amber-500 outline-none text-sm"
      />
    </div>
  );
}
