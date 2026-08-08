import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Wallet, Store, Loader2, Camera, Plus, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadVendorMedia } from "@/lib/vendor-media";

export type OneQrProfile = {
  business_name: string | null;
  shop_bio: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
};

/**
 * Bottom hub sheet opened from the centre of the bottom pill:
 * My Wallet (campaign fund) + Business profile editing.
 */
export function OneQrHubSheet({
  open,
  onClose,
  onProfileSaved,
}: {
  open: boolean;
  onClose: () => void;
  onProfileSaved?: (p: OneQrProfile) => void;
}) {
  const [tab, setTab] = useState<"wallet" | "profile">("wallet");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [form, setForm] = useState<OneQrProfile>({
    business_name: "", shop_bio: "", avatar_url: null, cover_image_url: null,
  });
  const avatarInput = useRef<HTMLInputElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!alive) return;
      setUserId(uid);
      if (uid) {
        const { data: vendor } = await supabase
          .from("vendors")
          .select("id, business_name, shop_bio, avatar_url, cover_image_url")
          .eq("user_id", uid)
          .maybeSingle();
        if (!alive) return;
        if (vendor) {
          setForm({
            business_name: vendor.business_name ?? "",
            shop_bio: vendor.shop_bio ?? "",
            avatar_url: vendor.avatar_url ?? null,
            cover_image_url: vendor.cover_image_url ?? null,
          });
          const { data: w } = await supabase
            .from("vendor_wallets")
            .select("service_balance_paise")
            .eq("vendor_id", vendor.id)
            .maybeSingle();
          if (alive) setBalance(Math.round((w?.service_balance_paise ?? 0) / 100));
        }
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [open]);

  const pick = async (kind: "avatar" | "cover", file?: File | null) => {
    if (!file || !userId) return;
    setUploading(kind);
    try {
      const url = await uploadVendorMedia({ userId, file, kind });
      setForm((f) => ({ ...f, [kind === "avatar" ? "avatar_url" : "cover_image_url"]: url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload nahi hua");
    }
    setUploading(null);
  };

  const save = async () => {
    if (!userId) { toast.error("Login karein"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("vendors")
      .update({
        business_name: form.business_name,
        shop_bio: form.shop_bio,
        avatar_url: form.avatar_url,
        cover_image_url: form.cover_image_url,
      })
      .eq("user_id", userId);
    setSaving(false);
    if (error) { toast.error("Save nahi hua"); return; }
    toast.success("Business profile update ho gaya");
    onProfileSaved?.(form);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[165] bg-black/55 flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-auto max-h-[88vh] overflow-y-auto rounded-t-[30px] bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4"
          >
            <div className="flex items-center">
              <h3 className="font-display text-[16px] font-bold text-slate-900">My One QR hub</h3>
              <button
                onClick={onClose}
                aria-label="Close hub"
                className="ml-auto h-9 w-9 grid place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-amber-200 bg-amber-50/70 p-1">
              {([
                { key: "wallet" as const, label: "My Wallet", icon: Wallet },
                { key: "profile" as const, label: "Business profile", icon: Store },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`h-10 rounded-full text-[12px] font-extrabold inline-flex items-center justify-center gap-1.5 ${
                    tab === t.key ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white" : "text-amber-800/70"
                  }`}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
            ) : tab === "wallet" ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-[26px] bg-gradient-to-br from-slate-900 to-slate-700 px-5 py-5 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">Campaign balance</p>
                  <p className="mt-1 font-display text-[30px] font-extrabold leading-none inline-flex items-center">
                    <IndianRupee className="h-6 w-6" />{balance}
                  </p>
                  <p className="mt-2 text-[11px] text-white/70">Ads aur campaigns isi balance se chalte hain.</p>
                </div>
                <a
                  href="/vendor/wallet"
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-amber-500 text-[13px] font-extrabold text-white active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" strokeWidth={3} /> Add fund
                </a>
                <p className="text-[11px] text-slate-500">
                  Recharge ke baad campaign turant live ho jata hai — har ad click wallet se cut hota hai.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="relative h-28 overflow-hidden rounded-[24px] border border-amber-200 bg-amber-50">
                  {form.cover_image_url && (
                    <img src={form.cover_image_url} alt="Shop cover" className="h-full w-full object-cover" />
                  )}
                  <button
                    onClick={() => coverInput.current?.click()}
                    className="absolute bottom-2 right-2 h-9 px-3 rounded-full bg-white/90 text-[11px] font-extrabold text-slate-800 inline-flex items-center gap-1.5 active:scale-95"
                  >
                    {uploading === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    Cover
                  </button>
                  <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => pick("cover", e.target.files?.[0])} />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => avatarInput.current?.click()}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-amber-300 bg-amber-50 grid place-items-center active:scale-95"
                    aria-label="Change logo"
                  >
                    {form.avatar_url
                      ? <img src={form.avatar_url} alt="Shop logo" className="h-full w-full object-cover" />
                      : uploading === "avatar" ? <Loader2 className="h-4 w-4 animate-spin text-amber-700" /> : <Camera className="h-5 w-5 text-amber-700" />}
                  </button>
                  <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => pick("avatar", e.target.files?.[0])} />
                  <div className="flex-1 space-y-2">
                    <input
                      value={form.business_name ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                      placeholder="Business name"
                      className="h-11 w-full rounded-2xl border border-amber-200 bg-white px-3 text-[13px] font-bold text-slate-900 outline-none focus:border-amber-400"
                    />
                    <input
                      value={form.shop_bio ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, shop_bio: e.target.value }))}
                      placeholder="Tagline"
                      className="h-11 w-full rounded-2xl border border-amber-200 bg-white px-3 text-[12.5px] text-slate-700 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-[13px] font-extrabold text-white inline-flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save profile
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
