import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Facebook, Instagram, Twitter, Send, Youtube, Linkedin, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminLayout, PageHeader, GoldButton, GoldCard } from "@/components/admin/AdminLayout";
import { DEFAULT_SERVICE_ROWS, SERVICE_CATALOGUE, SERVICE_MENU_KEY, type ServiceMenuRow } from "@/lib/service-menu";

type Links = {
  facebook: string;
  instagram: string;
  twitter: string;
  telegram: string;
  youtube: string;
  linkedin: string;
  whatsapp: string;
};

const EMPTY: Links = {
  facebook: "", instagram: "", twitter: "", telegram: "", youtube: "", linkedin: "", whatsapp: "",
};

const FIELDS: Array<{ key: keyof Links; label: string; Icon: typeof Facebook; color: string; placeholder: string }> = [
  { key: "facebook", label: "Facebook", Icon: Facebook, color: "#1877F2", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", Icon: Instagram, color: "#E4405F", placeholder: "https://instagram.com/yourhandle" },
  { key: "twitter", label: "X (Twitter)", Icon: Twitter, color: "#000", placeholder: "https://x.com/yourhandle" },
  { key: "telegram", label: "Telegram", Icon: Send, color: "#0088cc", placeholder: "https://t.me/yourchannel" },
  { key: "youtube", label: "YouTube", Icon: Youtube, color: "#FF0000", placeholder: "https://youtube.com/@yourchannel" },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin, color: "#0A66C2", placeholder: "https://linkedin.com/company/..." },
  { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle, color: "#25D366", placeholder: "https://wa.me/91XXXXXXXXXX" },
];

export const Route = createFileRoute("/admin/settings")({
  component: () => (
    <AdminLayout>
      <SettingsPage />
    </AdminLayout>
  ),
});

function SettingsPage() {
  const [links, setLinks] = useState<Links>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "social_links")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setLinks({ ...EMPTY, ...(data.value as Partial<Links>) });
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "social_links", value: links, updated_by: sess.user?.id, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Social links saved");
  };

  return (
    <div>
      <PageHeader
        title="App Settings"
        subtitle="Social media links — yeh customer app ke footer me dikhenge"
      />

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </div>
      ) : (
        <GoldCard className="p-5 space-y-4 max-w-2xl">
          <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold">Social Media Links</h3>

          {FIELDS.map(({ key, label, Icon, color, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg grid place-items-center bg-black/40 border border-[#d4af37]/30 flex-shrink-0">
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">{label}</label>
                <input
                  value={links[key]}
                  onChange={(e) => setLinks({ ...links, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full mt-0.5 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-3 border-t border-[#d4af37]/20">
            <GoldButton onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 inline animate-spin mr-1" /> : <Save className="h-3 w-3 inline -mt-0.5 mr-1" />}
              Save Settings
            </GoldButton>
          </div>

          <p className="text-[10px] text-[#f5d97a]/50">
            Tip: Empty fields are hidden from the customer footer. Use full URLs (https://...).
          </p>
        </GoldCard>
      )}

      <div className="mt-6 max-w-2xl"><ServiceMenuCard /></div>
      <div className="mt-6 max-w-2xl"><LeadDefaultsCard /></div>
      <div className="mt-6 max-w-2xl"><NoVendorStateCard /></div>
      <div className="mt-6 max-w-2xl"><VendorAppCard /></div>
      <div className="mt-6 max-w-2xl"><MediaLibraryCard /></div>
    </div>
  );
}

function LeadDefaultsCard() {
  const [val, setVal] = useState({ max_vendors_per_lead: 5, default_price_inr: 20 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "lead_defaults").maybeSingle().then(({ data }) => {
      if (data?.value) setVal((p) => ({ ...p, ...(data.value as any) }));
      setLoading(false);
    });
  }, []);
  const save = async () => {
    setSaving(true);
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase.from("app_settings")
      .upsert({ key: "lead_defaults", value: val, updated_by: sess.user?.id, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Lead defaults saved");
  };
  if (loading) return null;
  return (
    <GoldCard className="p-5 space-y-4">
      <div>
        <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold">Lead Defaults</h3>
        <p className="text-[11px] text-[#f5d97a]/60 mt-1">Used jab category-level override set na ho.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">Max Vendors Per Lead</label>
          <input type="number" value={val.max_vendors_per_lead}
            onChange={(e) => setVal({ ...val, max_vendors_per_lead: parseInt(e.target.value) || 0 })}
            className="w-full mt-0.5 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">Default Price ₹ per Lead</label>
          <input type="number" value={val.default_price_inr}
            onChange={(e) => setVal({ ...val, default_price_inr: parseFloat(e.target.value) || 0 })}
            className="w-full mt-0.5 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs" />
        </div>
      </div>
      <div className="flex justify-end pt-3 border-t border-[#d4af37]/20">
        <GoldButton onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 inline animate-spin mr-1" /> : <Save className="h-3 w-3 inline -mt-0.5 mr-1" />}
          Save Lead Defaults
        </GoldButton>
      </div>
    </GoldCard>
  );
}

function VendorAppCard() {
  const [val, setVal] = useState({ apk_url: "", play_store_url: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "vendor_app").maybeSingle().then(({ data }) => {
      if (data?.value) setVal((p) => ({ ...p, ...(data.value as any) }));
      setLoading(false);
    });
  }, []);
  const save = async () => {
    setSaving(true);
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase.from("app_settings")
      .upsert({ key: "vendor_app", value: val, updated_by: sess.user?.id, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Vendor app links saved");
  };
  if (loading) return null;
  return (
    <GoldCard className="p-5 space-y-4">
      <div>
        <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold">Vendor App Download</h3>
        <p className="text-[11px] text-[#f5d97a]/60 mt-1">Vendor registration ke baad ye link customer ko dikhega.</p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">Play Store URL</label>
          <input value={val.play_store_url}
            onChange={(e) => setVal({ ...val, play_store_url: e.target.value })}
            placeholder="https://play.google.com/store/apps/details?id=..."
            className="w-full mt-0.5 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">Direct APK URL</label>
          <input value={val.apk_url}
            onChange={(e) => setVal({ ...val, apk_url: e.target.value })}
            placeholder="https://.../vendor-app.apk"
            className="w-full mt-0.5 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs" />
        </div>
      </div>
      <div className="flex justify-end pt-3 border-t border-[#d4af37]/20">
        <GoldButton onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 inline animate-spin mr-1" /> : <Save className="h-3 w-3 inline -mt-0.5 mr-1" />}
          Save Vendor App Links
        </GoldButton>
      </div>
    </GoldCard>
  );
}

function MediaLibraryCard() {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "media_library").maybeSingle().then(({ data }) => {
      const arr = (data?.value as any)?.items ?? [];
      setItems(Array.isArray(arr) ? arr : []);
      setLoading(false);
    });
  }, []);
  const persist = async (next: string[]) => {
    setSaving(true);
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase.from("app_settings")
      .upsert({ key: "media_library", value: { items: next }, updated_by: sess.user?.id, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Library updated");
  };
  const add = async () => {
    const v = draft.trim();
    if (!v) return;
    const next = [v, ...items.filter((x) => x !== v)].slice(0, 200);
    setItems(next); setDraft("");
    await persist(next);
  };
  const remove = async (v: string) => {
    const next = items.filter((x) => x !== v);
    setItems(next);
    await persist(next);
  };
  if (loading) return null;
  return (
    <GoldCard className="p-5 space-y-4">
      <div>
        <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold">Image Library</h3>
        <p className="text-[11px] text-[#f5d97a]/60 mt-1">
          Image / Lottie URLs ya emoji yahan ek baar add karein — phir har picker me ek-click select.
        </p>
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          placeholder="https://image.url or 🛠️"
          className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs" />
        <GoldButton onClick={add} disabled={saving || !draft.trim()}>Add</GoldButton>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-[#f5d97a]/40 text-center py-4">No items yet.</p>
      ) : (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
          {items.map((v) => (
            <div key={v} className="relative group">
              <div className="aspect-square rounded-lg border border-[#d4af37]/30 bg-black/40 grid place-items-center overflow-hidden text-xl">
                {/^https?:\/\//.test(v) ? (
                  /\.json($|\?)/i.test(v)
                    ? <span className="text-[9px] text-[#d4af37]">LOTTIE</span>
                    : <img src={v} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : <span>{v}</span>}
              </div>
              <button onClick={() => remove(v)}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500/80 text-white text-[10px] grid place-items-center opacity-0 group-hover:opacity-100">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </GoldCard>
  );
}

function NoVendorStateCard() {
  const [val, setVal] = useState({ video_url: "", message: "Yahan vendor available nahi hai. Thodi der baad try kariye." });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "no_vendor_state").maybeSingle().then(({ data }) => {
      if (data?.value) setVal((p) => ({ ...p, ...(data.value as any) }));
      setLoading(false);
    });
  }, []);
  const save = async () => {
    setSaving(true);
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase.from("app_settings")
      .upsert({ key: "no_vendor_state", value: val, updated_by: sess.user?.id, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("No-vendor video saved");
  };
  if (loading) return null;
  return (
    <GoldCard className="p-5 space-y-4">
      <div>
        <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold">"No Vendor Available" Screen</h3>
        <p className="text-[11px] text-[#f5d97a]/60 mt-1">
          Jab customer ko aas-paas koi vendor nahi milta, yeh video aur message dikhega. MP4 / WebM URL daalein.
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">Video URL (MP4 / WebM)</label>
          <input value={val.video_url}
            onChange={(e) => setVal({ ...val, video_url: e.target.value })}
            placeholder="https://...mp4"
            className="w-full mt-0.5 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">Customer Message (Hindi/English)</label>
          <textarea value={val.message}
            onChange={(e) => setVal({ ...val, message: e.target.value })}
            rows={2}
            className="w-full mt-0.5 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs" />
        </div>
        {val.video_url && (
          <div className="rounded-lg overflow-hidden border border-[#d4af37]/30 bg-black aspect-video max-w-xs">
            <video src={val.video_url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      <div className="flex justify-end pt-3 border-t border-[#d4af37]/20">
        <GoldButton onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 inline animate-spin mr-1" /> : <Save className="h-3 w-3 inline -mt-0.5 mr-1" />}
          Save No-Vendor Screen
        </GoldButton>
      </div>
    </GoldCard>
  );
}

function ServiceMenuCard() {
  const [rows, setRows] = useState<ServiceMenuRow[]>(DEFAULT_SERVICE_ROWS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", SERVICE_MENU_KEY).maybeSingle().then(({ data }) => {
      const arr = (data?.value as { services?: ServiceMenuRow[] } | null)?.services;
      if (Array.isArray(arr) && arr.length) {
        // keep catalogue order/ids authoritative, config wins for enabled/order
        const cfg = new Map(arr.map((r) => [r.id, r]));
        setRows(DEFAULT_SERVICE_ROWS.map((d, i) => ({
          id: d.id,
          enabled: cfg.get(d.id)?.enabled !== false,
          order: cfg.get(d.id)?.order ?? i + 1,
        })));
      }
      setLoading(false);
    });
  }, []);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    setRows(next.map((r, i) => ({ ...r, order: i + 1 })));
  };

  const save = async () => {
    setSaving(true);
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase.from("app_settings").upsert({
      key: SERVICE_MENU_KEY,
      value: { services: rows },
      updated_by: sess.user?.id,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Service menu updated");
  };

  if (loading) return null;
  const ordered = [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <GoldCard className="p-5 space-y-4">
      <div>
        <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold">Service Selection Menu</h3>
        <p className="text-[11px] text-[#f5d97a]/60 mt-1">
          Signup / login ke baad customer ko yahi menu dikhta hai. OFF kiya hua service bilkul chhip jayega.
        </p>
      </div>

      <div className="space-y-2">
        {ordered.map((r, i) => {
          const def = SERVICE_CATALOGUE.find((s) => s.id === r.id);
          if (!def) return null;
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-lg bg-black/30 border border-[#d4af37]/25 px-3 py-2.5">
              <def.icon className="h-4 w-4 text-[#d4af37] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#fff8dc] truncate">{def.label}</p>
                <p className="text-[10px] text-[#f5d97a]/50 truncate">{def.route}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(i, -1)} aria-label="Move up"
                  className="h-6 w-6 grid place-items-center rounded bg-black/40 border border-[#d4af37]/25 text-[#d4af37] text-xs">↑</button>
                <button onClick={() => move(i, 1)} aria-label="Move down"
                  className="h-6 w-6 grid place-items-center rounded bg-black/40 border border-[#d4af37]/25 text-[#d4af37] text-xs">↓</button>
              </div>
              <button
                onClick={() => setRows((p) => p.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))}
                aria-label={`${def.label} ${r.enabled ? "ON" : "OFF"}`}
                className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${r.enabled ? "bg-emerald-500" : "bg-white/20"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${r.enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-3 border-t border-[#d4af37]/20">
        <GoldButton onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 inline animate-spin mr-1" /> : <Save className="h-3 w-3 inline -mt-0.5 mr-1" />}
          Save Service Menu
        </GoldButton>
      </div>
    </GoldCard>
  );
}
