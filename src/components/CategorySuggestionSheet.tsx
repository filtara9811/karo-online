import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ImagePlus, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  category_name: z.string().trim().min(1, "Category name required").max(120),
  subcategory_name: z.string().trim().max(120).optional().or(z.literal("")),
  child_category_name: z.string().trim().max(120).optional().or(z.literal("")),
  note: z.string().trim().max(600).optional().or(z.literal("")),
});

export type CategorySuggestionDefaults = {
  category_name?: string;
  subcategory_name?: string;
  child_category_name?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  defaults?: CategorySuggestionDefaults;
};

export function CategorySuggestionSheet({ open, onClose, defaults }: Props) {
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [child, setChild] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCat(defaults?.category_name ?? "");
      setSub(defaults?.subcategory_name ?? "");
      setChild(defaults?.child_category_name ?? "");
      setNote("");
      setFile(null);
      setPreview(null);
    }
  }, [open, defaults]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = () => fileInputRef.current?.click();
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 5 * 1024 * 1024) {
      toast.error("Photo too large (max 5MB)");
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      category_name: cat, subcategory_name: sub, child_category_name: child, note,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) { toast.error("Please sign in first"); return; }

      let image_url: string | null = null;
      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `suggestions/${uid}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("catalog").upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
        if (up.error) {
          console.warn("photo upload failed", up.error.message);
          toast.warning("Couldn't attach photo — submitting without it");
        } else {
          const { data: pub } = supabase.storage.from("catalog").getPublicUrl(path);
          image_url = pub.publicUrl;
        }
      }

      const { error } = await supabase.from("category_suggestions").insert({
        suggested_by: uid,
        category_name: parsed.data.category_name,
        subcategory_name: parsed.data.subcategory_name || null,
        child_category_name: parsed.data.child_category_name || null,
        note: parsed.data.note || null,
        image_url,
      });
      if (error) throw error;
      toast.success("Thanks! Sent to admin for review.");
      onClose();
    } catch (e: any) {
      console.error("[CategorySuggestion] insert failed", e);
      toast.error(e?.message ?? "Could not submit suggestion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[81] rounded-t-3xl bg-white shadow-2xl max-h-[88vh] overflow-y-auto"
            style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 pt-3 pb-3 border-b border-[color:oklch(0.78_0.14_82/0.25)]">
              <div className="mx-auto h-1 w-10 rounded-full bg-[color:oklch(0.78_0.14_82/0.4)] mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[color:oklch(0.25_0.05_85)]">
                  Other / Custom Request
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="h-8 w-8 grid place-items-center rounded-full bg-[color:oklch(0.95_0.02_85)] hover:bg-[color:oklch(0.90_0.04_85)]"
                >
                  <X className="h-4 w-4 text-[color:oklch(0.35_0.05_85)]" />
                </button>
              </div>
              <p className="text-xs text-[color:oklch(0.45_0.08_85)] mt-1">
                Don't see your service? Tell us what you need — we'll find a vendor or add it for everyone.
              </p>
            </div>

            <div className="px-5 py-4 space-y-3">
              <Field label="What do you need?" required>
                <input
                  value={cat} onChange={(e) => setCat(e.target.value)} maxLength={120}
                  placeholder="e.g. Pet grooming at home"
                  className="input-base"
                />
              </Field>
              <Field label="Type / Sub-service (optional)">
                <input
                  value={sub} onChange={(e) => setSub(e.target.value)} maxLength={120}
                  placeholder="e.g. Dog grooming"
                  className="input-base"
                />
              </Field>
              <Field label="More detail (optional)">
                <input
                  value={child} onChange={(e) => setChild(e.target.value)} maxLength={120}
                  placeholder="e.g. Bath & nail trim for medium dog"
                  className="input-base"
                />
              </Field>
              <Field label="Describe your request (optional)">
                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)} maxLength={600}
                  rows={3}
                  placeholder="When, where, budget, brand preference — anything that helps us match the right vendor."
                  className="input-base resize-none"
                />
                <div className="text-[10px] text-right text-[color:oklch(0.55_0.05_85)] mt-1">
                  {note.length}/600
                </div>
              </Field>

              <Field label="Reference photo (optional)">
                <input
                  ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={onPick}
                />
                {preview ? (
                  <div className="relative h-32 w-full rounded-xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.4)]">
                    <img src={preview} alt="preview" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setFile(null)}
                      className="absolute top-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-full bg-black/60 text-white"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button" onClick={pickFile}
                    className="h-24 w-full rounded-xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center gap-1 text-[color:oklch(0.45_0.08_85)] hover:bg-[color:oklch(0.97_0.02_85)] transition-colors"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-xs font-medium">Add reference photo</span>
                    <span className="text-[10px]">Max 5MB</span>
                  </button>
                )}
              </Field>

              <button
                onClick={submit}
                disabled={submitting || !cat.trim()}
                className="btn-3d w-full h-12 rounded-2xl bg-gradient-to-r from-[#d97706] to-[#c2410c] text-white font-bold tracking-wide shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Sending…" : "Send Request"}
              </button>
            </div>
          </motion.div>

          <style>{`
            .input-base {
              width: 100%;
              padding: 10px 12px;
              border-radius: 12px;
              border: 1.5px solid oklch(0.78 0.14 82 / 0.35);
              background: white;
              font-size: 14px;
              color: oklch(0.25 0.05 85);
              outline: none;
              transition: border-color 0.15s, box-shadow 0.15s;
            }
            .input-base:focus {
              border-color: oklch(0.65 0.18 60);
              box-shadow: 0 0 0 3px oklch(0.78 0.14 82 / 0.18);
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-[color:oklch(0.35_0.05_85)] mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
