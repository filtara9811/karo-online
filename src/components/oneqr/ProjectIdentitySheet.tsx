import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadVendorMedia } from "@/lib/vendor-media";
import { SheetShell } from "./SheetShell";

export type ProjectIdentity = {
  business_name: string;
  contact_phone: string;
  category: string;
  avatar_url: string | null;
  cover_image_url: string | null;
};

/**
 * Per-project shop identity editor. Every QR project is its own shop, so name,
 * phone, category, logo and cover are saved on the project row — never on the
 * account-level vendor profile.
 */
export function ProjectIdentitySheet({
  open,
  onClose,
  projectId,
  projectTitle,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  projectTitle: string;
  initial: ProjectIdentity;
  onSaved: (patch: ProjectIdentity) => void;
}) {
  const [form, setForm] = useState<ProjectIdentity>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const avatarInput = useRef<HTMLInputElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const pick = async (kind: "avatar" | "cover", file: File | undefined) => {
    if (!file) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { toast.error("Login karein"); return; }
    setUploading(kind);
    try {
      const url = await uploadVendorMedia({ userId: uid, file, kind });
      setForm((f) => (kind === "avatar" ? { ...f, avatar_url: url } : { ...f, cover_image_url: url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload fail");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!projectId) return;
    if (form.business_name.trim().length < 2) { toast.error("Shop ka naam likhein"); return; }
    setSaving(true);
    const patch = {
      business_name: form.business_name.trim(),
      contact_phone: form.contact_phone.replace(/\D/g, "").slice(-10),
      category: form.category.trim() || null,
      avatar_url: form.avatar_url,
      cover_image_url: form.cover_image_url,
    };
    const { error } = await supabase.from("qr_projects").update(patch as never).eq("id", projectId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved({ ...form, business_name: patch.business_name, contact_phone: patch.contact_phone, category: patch.category ?? "" });
    toast.success("Shop profile save ho gaya");
    onClose();
  };

  return (
    <SheetShell
      section="project-profile"
      open={open}
      onClose={onClose}
      title="Shop profile"
      subtitle={`${projectTitle} — is project ki apni identity`}
      footer={
        <button
          onClick={save}
          disabled={saving || !projectId}
          className="h-11 w-full rounded-2xl bg-amber-500 text-[13px] font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save shop profile"}
        </button>
      }
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => coverInput.current?.click()}
          className="relative grid h-36 w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-amber-300 bg-amber-50/60"
        >
          {form.cover_image_url ? (
            <img src={form.cover_image_url} alt="Shop cover" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-amber-700">
              <Camera className="h-6 w-6" />
              <span className="text-[11px] font-bold">Shop cover photo</span>
            </span>
          )}
          {uploading === "cover" && (
            <span className="absolute inset-0 grid place-items-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            </span>
          )}
        </button>
        <input ref={coverInput} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; pick("cover", f); }} />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => avatarInput.current?.click()}
            className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-amber-50 text-amber-600 ring-2 ring-amber-200"
          >
            {form.avatar_url
              ? <img src={form.avatar_url} alt="Shop logo" className="h-full w-full object-cover" />
              : <Store className="h-5 w-5" />}
            {uploading === "avatar" && (
              <span className="absolute inset-0 grid place-items-center bg-white/70">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              </span>
            )}
          </button>
          <p className="text-[11px] text-slate-500">
            Shop ka logo — QR landing page aur marketplace me yahi dikhega.
          </p>
        </div>
        <input ref={avatarInput} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; pick("avatar", f); }} />

        <Field label="Shop name">
          <input
            value={form.business_name}
            onChange={(e) => setForm({ ...form, business_name: e.target.value.slice(0, 60) })}
            placeholder="Filtara Fashion"
            className="w-full bg-transparent text-sm text-slate-900 outline-none"
          />
        </Field>
        <Field label="Shop phone / WhatsApp">
          <input
            value={form.contact_phone}
            inputMode="numeric"
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            placeholder="9876543210"
            className="w-full bg-transparent text-sm text-slate-900 outline-none"
          />
        </Field>
        <Field label="Category">
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value.slice(0, 40) })}
            placeholder="Clothing store"
            className="w-full bg-transparent text-sm text-slate-900 outline-none"
          />
        </Field>
      </div>
    </SheetShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-amber-400">
        {children}
      </div>
    </label>
  );
}
