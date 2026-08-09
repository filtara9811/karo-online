import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, Image as ImageIcon, Store, IndianRupee, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { uploadVendorMedia } from "@/lib/vendor-media";

export type NewProjectDraft = {
  title: string;
  business_name: string;
  contact_phone: string;
  category: string;
  avatar_url: string | null;
  cover_image_url: string | null;
};

/**
 * Details form for a new QR project. First project is free; the rest are paid
 * (price shown here, payment happens after submit in the dashboard).
 */
export function NewProjectSheet({
  open, onClose, userId, paid, priceInr, busy, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  paid: boolean;
  priceInr: number;
  busy?: boolean;
  onSubmit: (draft: NewProjectDraft) => void;
}) {
  const [form, setForm] = useState<NewProjectDraft>({
    title: "", business_name: "", contact_phone: "", category: "", avatar_url: null, cover_image_url: null,
  });
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const avatarRef = useRef<HTMLInputElement | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);

  const set = <K extends keyof NewProjectDraft>(k: K, v: NewProjectDraft[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pick = async (kind: "avatar" | "cover", file?: File | null) => {
    if (!file || !userId) return;
    setUploading(kind);
    try {
      const url = await uploadVendorMedia({ userId, file, kind });
      set(kind === "avatar" ? "avatar_url" : "cover_image_url", url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const submit = () => {
    if (!form.title.trim()) { toast.error("Project ka naam likhein"); return; }
    if (!form.business_name.trim()) { toast.error("Business name likhein"); return; }
    if (!/^\d{10}$/.test(form.contact_phone.replace(/\D/g, ""))) { toast.error("10 digit mobile number likhein"); return; }
    onSubmit({ ...form, contact_phone: form.contact_phone.replace(/\D/g, "") });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[160] bg-black/50"
          />
          <motion.section
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[161] max-h-[92vh] overflow-y-auto overscroll-contain rounded-t-[28px] bg-white"
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 pt-3 pb-2.5 border-b border-black/5 flex items-center gap-2">
              <span className="h-9 w-9 grid place-items-center rounded-full bg-amber-100 text-amber-700"><Sparkles className="h-4 w-4" /></span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-[15px] text-slate-900">New QR project</p>
                <p className="text-[11px] text-slate-500">
                  {paid ? `Extra project — ₹${priceInr} one time` : "Pehla project free hai"}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close" className="h-9 w-9 grid place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-90">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-3.5 pb-8">
              {/* Cover + logo */}
              <div className="relative rounded-3xl overflow-hidden border border-amber-200 bg-amber-50 h-32">
                {form.cover_image_url
                  ? <img src={form.cover_image_url} alt="Cover" className="h-full w-full object-cover" />
                  : <div className="h-full w-full grid place-items-center text-amber-600 text-[11px] font-bold">Cover image</div>}
                <button
                  onClick={() => coverRef.current?.click()}
                  className="absolute top-2 right-2 h-9 px-3 rounded-full bg-white/90 text-[11px] font-extrabold text-slate-800 inline-flex items-center gap-1.5 active:scale-95"
                >
                  {uploading === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />} Cover
                </button>
                <button
                  onClick={() => avatarRef.current?.click()}
                  className="absolute -bottom-0 left-3 h-16 w-16 rounded-full ring-4 ring-white overflow-hidden bg-white grid place-items-center text-amber-600 active:scale-95"
                >
                  {form.avatar_url
                    ? <img src={form.avatar_url} alt="Logo" className="h-full w-full object-cover" />
                    : uploading === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-5 w-5" />}
                </button>
              </div>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick("cover", e.target.files?.[0])} />
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick("avatar", e.target.files?.[0])} />

              <Field label="Project name" value={form.title} onChange={(v) => set("title", v)} placeholder="Shop Gate QR" />
              <Field label="Business name" value={form.business_name} onChange={(v) => set("business_name", v)} placeholder="Filtara Fashion" />
              <Field label="Mobile number" value={form.contact_phone} onChange={(v) => set("contact_phone", v)} placeholder="98xxxxxxxx" inputMode="numeric" />
              <Field label="Category" value={form.category} onChange={(v) => set("category", v)} placeholder="Retail / Fashion" />

              <button
                onClick={submit}
                disabled={!!busy || !!uploading}
                className="w-full h-14 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-display font-extrabold text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : paid ? <IndianRupee className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                {paid ? `Pay ₹${priceInr} & create` : "Create free project"}
              </button>
              {paid && (
                <p className="text-[10.5px] text-slate-500 text-center">
                  Payment gateway par redirect hoga — payment success hone par hi project banega.
                </p>
              )}
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({
  label, value, onChange, placeholder, inputMode,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; inputMode?: "numeric" | "text" }) {
  return (
    <label className="relative block">
      <span className="absolute -top-2 left-3 px-1.5 bg-white text-[10px] font-bold text-amber-700">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 rounded-2xl border border-amber-200 bg-white px-3.5 text-[13.5px] font-semibold text-slate-900 outline-none focus:border-amber-400"
      />
    </label>
  );
}
