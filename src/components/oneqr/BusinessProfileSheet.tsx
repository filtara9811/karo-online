import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Camera, Store, Users, Loader2, Building2, Phone, Mail, MapPin, Tags,
  Boxes, Factory, Globe, ChevronDown, Plus, Trash2, User, IdCard,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadVendorMedia } from "@/lib/vendor-media";

export type BusinessAddress = {
  label: string;
  address: string;
  city: string;
  pincode: string;
};

export type BusinessProfileForm = {
  business_name: string;
  whatsapp: string;
  email: string;
  trade: string;
  deals_in: string;
  vendor_type: string;
  operation_mode: string;
  owner_name: string;
  pan: string;
  aadhaar: string;
  shop_bio: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  business_addresses: BusinessAddress[];
};

const EMPTY: BusinessProfileForm = {
  business_name: "", whatsapp: "", email: "", trade: "", deals_in: "",
  vendor_type: "", operation_mode: "", owner_name: "", pan: "", aadhaar: "",
  shop_bio: "", avatar_url: null, cover_image_url: null, business_addresses: [],
};

const DEALS = ["Product", "Service", "Product | Service"];
const VENDOR_TYPES = ["Retail", "Wholesale", "Manufacture", "Wholesale | Manufacture"];
const MODES = ["Shop", "Online", "Shop | Online", "Home Service"];

/**
 * Full-height merchant profile editor with Business / Personal tabs,
 * notched-label fields and a multi-address editor.
 */
export function BusinessProfileSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (p: BusinessProfileForm) => void;
}) {
  const [tab, setTab] = useState<"business" | "personal">("business");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessProfileForm>(EMPTY);
  const [addrOpen, setAddrOpen] = useState(false);
  const avatarInput = useRef<HTMLInputElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);

  const set = <K extends keyof BusinessProfileForm>(k: K, v: BusinessProfileForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

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
        const { data: v } = await supabase
          .from("vendors")
          .select("business_name, whatsapp, email, trade, deals_in, vendor_type, operation_mode, owner_name, pan, aadhaar, shop_bio, avatar_url, cover_image_url, business_addresses")
          .eq("user_id", uid)
          .maybeSingle();
        if (!alive) return;
        if (v) {
          const raw = (v as { business_addresses?: unknown }).business_addresses;
          setForm({
            business_name: v.business_name ?? "",
            whatsapp: v.whatsapp ?? "",
            email: v.email ?? "",
            trade: v.trade ?? "",
            deals_in: v.deals_in ?? "",
            vendor_type: v.vendor_type ?? "",
            operation_mode: v.operation_mode ?? "",
            owner_name: v.owner_name ?? "",
            pan: v.pan ?? "",
            aadhaar: v.aadhaar ?? "",
            shop_bio: v.shop_bio ?? "",
            avatar_url: v.avatar_url ?? null,
            cover_image_url: v.cover_image_url ?? null,
            business_addresses: Array.isArray(raw) ? (raw as BusinessAddress[]) : [],
          });
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
      set(kind === "avatar" ? "avatar_url" : "cover_image_url", url);
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
        whatsapp: form.whatsapp,
        email: form.email,
        trade: form.trade,
        deals_in: form.deals_in,
        vendor_type: form.vendor_type,
        operation_mode: form.operation_mode,
        owner_name: form.owner_name,
        pan: form.pan,
        aadhaar: form.aadhaar,
        shop_bio: form.shop_bio,
        avatar_url: form.avatar_url,
        cover_image_url: form.cover_image_url,
        business_addresses: form.business_addresses as never,
      } as never)
      .eq("user_id", userId);
    setSaving(false);
    if (error) { toast.error(error.message || "Save nahi hua"); return; }
    toast.success("Profile save ho gaya");
    onSaved?.(form);
    onClose();
  };

  const addrSummary = form.business_addresses[0]
    ? [form.business_addresses[0].address, form.business_addresses[0].city].filter(Boolean).join(", ")
    : "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[170] bg-black/55 flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-auto h-[94vh] overflow-y-auto overscroll-contain rounded-t-[30px] bg-gradient-to-b from-amber-50/80 to-white pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
          >
            {/* Cover + logo */}
            <div className="relative">
              <div className="relative h-40 overflow-hidden rounded-t-[30px] bg-gradient-to-br from-amber-200 to-orange-300">
                {form.cover_image_url && (
                  <img src={form.cover_image_url} alt="Business cover" className="h-full w-full object-cover" />
                )}
                <motion.div
                  aria-hidden
                  animate={{ x: ["-40%", "140%"] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                  className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />
                <button
                  onClick={onClose}
                  aria-label="Close profile"
                  className="absolute top-3 right-3 h-10 w-10 grid place-items-center rounded-full bg-white/90 text-slate-700 backdrop-blur active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={() => coverInput.current?.click()}
                  aria-label="Change cover"
                  className="absolute bottom-3 right-3 h-10 px-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 text-[11px] font-extrabold text-slate-800 backdrop-blur active:scale-95"
                >
                  {uploading === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  Cover
                </button>
              </div>

              <div className="px-4 -mt-9 flex items-end gap-2">
                <button
                  onClick={() => avatarInput.current?.click()}
                  aria-label="Change logo"
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-amber-100 ring-4 ring-white grid place-items-center active:scale-95"
                >
                  {form.avatar_url
                    ? <img src={form.avatar_url} alt="Business logo" className="h-full w-full object-cover" />
                    : <Store className="h-7 w-7 text-amber-700" />}
                  <span className="absolute bottom-0 inset-x-0 h-6 bg-black/45 grid place-items-center text-white">
                    {uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </span>
                </button>

                {/* Tabs */}
                <div className="mb-1 flex-1 grid grid-cols-2 gap-1 rounded-full border border-amber-200 bg-white/95 p-1 shadow-sm">
                  {([
                    { key: "business" as const, label: "Busness Details", icon: Building2 },
                    { key: "personal" as const, label: "Personal Details", icon: Users },
                  ]).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`relative h-9 rounded-full text-[11px] font-extrabold inline-flex items-center justify-center gap-1 ${tab === t.key ? "text-white" : "text-amber-800/70"}`}
                    >
                      {tab === t.key && (
                        <motion.span
                          layoutId="bp-tab"
                          transition={{ type: "spring", stiffness: 320, damping: 28 }}
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                        />
                      )}
                      <span className="relative inline-flex items-center gap-1"><t.icon className="h-3.5 w-3.5" /> {t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => pick("avatar", e.target.files?.[0])} />
            <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => pick("cover", e.target.files?.[0])} />

            {loading ? (
              <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 pt-5 space-y-3.5"
                >
                  {tab === "business" ? (
                    <>
                      <Field icon={Building2} label="Busness Naman" value={form.business_name} onChange={(v) => set("business_name", v)} placeholder="Karo Online" />
                      <Field icon={Phone} label="Busness Nambar" value={form.whatsapp} onChange={(v) => set("whatsapp", v.replace(/\D/g, "").slice(0, 10))} placeholder="9540068380" inputMode="numeric" />
                      <Field icon={Mail} label="Busness | Email" value={form.email} onChange={(v) => set("email", v)} placeholder="name@gmail.com" inputMode="email" />

                      {/* Multi address */}
                      <div className="rounded-3xl border border-amber-200 bg-white/95">
                        <button
                          onClick={() => setAddrOpen((v) => !v)}
                          className="relative w-full px-4 pt-4 pb-3.5 text-left"
                        >
                          <span className="absolute -top-2 left-4 inline-flex items-center gap-1 bg-white px-1.5 text-[10.5px] font-bold text-slate-500">
                            <MapPin className="h-3 w-3" /> Busness | Address
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="flex-1 text-[15px] font-semibold text-slate-900 line-clamp-2">
                              {addrSummary || "Address add karein"}
                            </span>
                            <motion.span animate={{ rotate: addrOpen ? 180 : 0 }} className="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-amber-50 text-amber-700">
                              <ChevronDown className="h-4 w-4" />
                            </motion.span>
                          </span>
                          {form.business_addresses.length > 1 && (
                            <span className="mt-1 inline-block text-[10.5px] font-bold text-amber-700">
                              +{form.business_addresses.length - 1} more address
                            </span>
                          )}
                        </button>

                        <AnimatePresence initial={false}>
                          {addrOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3.5 space-y-3">
                                {form.business_addresses.map((a, i) => (
                                  <div key={i} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <input
                                        value={a.label}
                                        onChange={(e) => set("business_addresses", form.business_addresses.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                                        placeholder={`Address ${i + 1} name (Shop / Godown)`}
                                        className="flex-1 h-10 rounded-xl border border-amber-200 bg-white px-3 text-[12.5px] font-semibold text-slate-900 outline-none"
                                      />
                                      <button
                                        onClick={() => set("business_addresses", form.business_addresses.filter((_, j) => j !== i))}
                                        aria-label="Remove address"
                                        className="h-10 w-10 grid place-items-center rounded-xl bg-white text-rose-500 border border-rose-100 active:scale-90"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <textarea
                                      value={a.address}
                                      onChange={(e) => set("business_addresses", form.business_addresses.map((x, j) => j === i ? { ...x, address: e.target.value } : x))}
                                      rows={2}
                                      placeholder="Full address, street, landmark"
                                      className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-[12.5px] text-slate-900 outline-none resize-none"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        value={a.city}
                                        onChange={(e) => set("business_addresses", form.business_addresses.map((x, j) => j === i ? { ...x, city: e.target.value } : x))}
                                        placeholder="City"
                                        className="h-10 rounded-xl border border-amber-200 bg-white px-3 text-[12.5px] text-slate-900 outline-none"
                                      />
                                      <input
                                        value={a.pincode}
                                        onChange={(e) => set("business_addresses", form.business_addresses.map((x, j) => j === i ? { ...x, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) } : x))}
                                        placeholder="Pincode"
                                        inputMode="numeric"
                                        className="h-10 rounded-xl border border-amber-200 bg-white px-3 text-[12.5px] text-slate-900 outline-none"
                                      />
                                    </div>
                                  </div>
                                ))}
                                <button
                                  onClick={() => set("business_addresses", [...form.business_addresses, { label: "", address: "", city: "", pincode: "" }])}
                                  className="w-full h-11 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 text-[12.5px] font-extrabold text-amber-800 inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                >
                                  <Plus className="h-4 w-4" strokeWidth={3} /> Add another address
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <Field icon={Tags} label="Busness | Catagry" value={form.trade} onChange={(v) => set("trade", v)} placeholder="Fashion | Apparels" />
                      <SelectField icon={Boxes} label="Busness | tepe" value={form.deals_in} onChange={(v) => set("deals_in", v)} options={DEALS} placeholder="Product | service" />
                      <SelectField icon={Factory} label="Busness | tepe" value={form.vendor_type} onChange={(v) => set("vendor_type", v)} options={VENDOR_TYPES} placeholder="Wholesale | manufacture" />
                      <SelectField icon={Globe} label="Busness | tepe" value={form.operation_mode} onChange={(v) => set("operation_mode", v)} options={MODES} placeholder="Shop | online" />
                      <Field icon={Store} label="Busness | About" value={form.shop_bio} onChange={(v) => set("shop_bio", v)} placeholder="Short business intro" />
                    </>
                  ) : (
                    <>
                      <Field icon={User} label="Owner Naman" value={form.owner_name} onChange={(v) => set("owner_name", v)} placeholder="Full name" />
                      <Field icon={Phone} label="Personal Nambar" value={form.whatsapp} onChange={(v) => set("whatsapp", v.replace(/\D/g, "").slice(0, 10))} placeholder="9540068380" inputMode="numeric" />
                      <Field icon={Mail} label="Personal | Email" value={form.email} onChange={(v) => set("email", v)} placeholder="name@gmail.com" inputMode="email" />
                      <Field icon={IdCard} label="PAN Nambar" value={form.pan} onChange={(v) => set("pan", v.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" />
                      <Field icon={IdCard} label="Aadhaar Nambar" value={form.aadhaar} onChange={(v) => set("aadhaar", v.replace(/\D/g, "").slice(0, 12))} placeholder="1234 5678 9012" inputMode="numeric" />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Sticky save */}
            <div className="fixed bottom-0 inset-x-0 z-10 pointer-events-none">
              <div className="max-w-md mx-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 bg-gradient-to-t from-white via-white/95 to-transparent">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={save}
                  disabled={saving}
                  className="pointer-events-auto w-full h-14 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-display text-[15px] font-extrabold inline-flex items-center justify-center gap-2 shadow-[0_16px_34px_-16px_rgba(245,158,11,0.9)]"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  Save profile
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  icon: Icon, label, value, onChange, placeholder, inputMode,
}: {
  icon: typeof Building2; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  inputMode?: "text" | "numeric" | "email" | "tel";
}) {
  return (
    <div className="relative rounded-3xl border border-amber-200 bg-white/95">
      <span className="absolute -top-2 left-4 inline-flex items-center gap-1 bg-white px-1.5 text-[10.5px] font-bold text-slate-500">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-label={label}
        className="w-full h-14 rounded-3xl bg-transparent px-4 text-[15px] font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
      />
    </div>
  );
}

function SelectField({
  icon: Icon, label, value, onChange, options, placeholder,
}: {
  icon: typeof Building2; label: string; value: string;
  onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <div className="relative rounded-3xl border border-amber-200 bg-white/95">
      <span className="absolute -top-2 left-4 inline-flex items-center gap-1 bg-white px-1.5 text-[10.5px] font-bold text-slate-500">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full h-14 appearance-none rounded-3xl bg-transparent px-4 pr-11 text-[15px] font-semibold text-slate-900 outline-none"
      >
        <option value="">{placeholder ?? "Select"}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    </div>
  );
}
