import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Loader2, MessageCircle, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendTestWhatsAppMessage } from "@/lib/whatsapp-admin.functions";
import { AdminLayout, GoldButton, GoldCard, PageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/whatsapp")({
  head: () => ({
    meta: [
      { title: "WhatsApp API — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminLayout>
      <WhatsAppPage />
    </AdminLayout>
  ),
});

type TemplateRow = { event: string; template_name: string; language: string };
type WhatsAppProvider = {
  id: string;
  provider: string;
  display_name: string;
  description: string | null;
  api_base_url: string | null;
  phone_number_id: string | null;
  business_account_id: string | null;
  app_id: string | null;
  access_token: string | null;
  webhook_verify_token: string | null;
  app_secret: string | null;
  default_template: string | null;
  template_namespace: string | null;
  assigned_use: string;
  quality_rating: string | null;
  is_active: boolean;
  is_test_mode: boolean;
  priority: number;
  config: Record<string, any>;
};

const ASSIGNMENTS = [
  { value: "none", label: "Not assigned" },
  { value: "transactional", label: "Transactional alerts" },
  { value: "otp", label: "OTP / login" },
  { value: "referral", label: "Referral updates" },
  { value: "campaign", label: "Campaigns / bulk" },
  { value: "fallback", label: "Fallback provider" },
];

const defaultTemplate = (): TemplateRow => ({ event: "referral_joined", template_name: "referral_joined", language: "hi" });

function WhatsAppPage() {
  const [providers, setProviders] = useState<WhatsAppProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("whatsapp_providers")
      .select("*")
      .order("priority");
    if (error) toast.error(error.message);
    setProviders(((data ?? []) as any[]).map((p) => ({ ...p, config: p.config ?? {} })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<WhatsAppProvider>) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const getTemplates = (p: WhatsAppProvider): TemplateRow[] => {
    const rows = Array.isArray(p.config.templates) ? p.config.templates : [];
    return rows.length ? rows : [defaultTemplate()];
  };

  const updateTemplate = (id: string, idx: number, key: keyof TemplateRow, value: string) => {
    setProviders((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const templates = getTemplates(p).map((t, i) => (i === idx ? { ...t, [key]: value } : t));
      return { ...p, config: { ...p.config, templates } };
    }));
  };

  const addTemplate = (id: string) => {
    setProviders((prev) => prev.map((p) => (
      p.id === id ? { ...p, config: { ...p.config, templates: [...getTemplates(p), defaultTemplate()] } } : p
    )));
  };

  const removeTemplate = (id: string, idx: number) => {
    setProviders((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const templates = getTemplates(p).filter((_, i) => i !== idx);
      return { ...p, config: { ...p.config, templates: templates.length ? templates : [defaultTemplate()] } };
    }));
  };

  const save = async (p: WhatsAppProvider) => {
    setSavingId(p.id);
    const templates = getTemplates(p).filter((t) => t.event.trim() || t.template_name.trim());
    const { error } = await (supabase as any)
      .from("whatsapp_providers")
      .update({
        api_base_url: p.api_base_url,
        phone_number_id: p.phone_number_id,
        business_account_id: p.business_account_id,
        app_id: p.app_id,
        access_token: p.access_token,
        webhook_verify_token: p.webhook_verify_token,
        app_secret: p.app_secret,
        default_template: p.default_template,
        template_namespace: p.template_namespace,
        assigned_use: p.assigned_use,
        quality_rating: p.quality_rating,
        is_active: p.is_active,
        is_test_mode: p.is_test_mode,
        priority: p.priority,
        config: { ...p.config, templates },
      })
      .eq("id", p.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`${p.display_name} saved`);
    load();
  };

  return (
    <div>
      <PageHeader
        title="WhatsApp API"
        subtitle="Fast2SMS Meta WhatsApp + Meta Cloud fallback — templates, live/test mode, failover priority"
      />

      <GoldCard className="p-4 mb-4">
        <p className="text-xs text-[#f5d97a]/85 leading-relaxed">
          🟢 <b className="text-[#fff8dc]">Fast2SMS WhatsApp:</b> yahan token, phone number ID, business account ID,
          templates aur webhook verify token paste karein. Test mode OFF karne ke baad hi live customer messages chalenge.
        </p>
      </GoldCard>

      {loading ? (
        <GoldCard className="p-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </GoldCard>
      ) : (
        <div className="grid gap-4">
          {providers.map((p) => (
            <GoldCard key={p.id} className="p-5">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-xl grid place-items-center shrink-0" style={{ background: "linear-gradient(180deg,#bbf7d0,#22c55e,#166534)" }}>
                    <MessageCircle className="h-5 w-5 text-[#04150a]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold flex items-center gap-2 truncate" style={{ background: "linear-gradient(180deg,#fff8dc,#d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {p.display_name}
                      {p.is_active && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]/60 truncate">{p.provider}</p>
                  </div>
                </div>
                <span className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-full font-bold whitespace-nowrap ${p.is_active ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-black/40 text-[#d4af37]/60 border border-[#d4af37]/20"}`}>
                  {p.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="API Base URL" value={p.api_base_url ?? ""} onChange={(v) => update(p.id, { api_base_url: v })} placeholder="https://graph.facebook.com/v20.0" />
                <Field label="Access Token / API Key" value={p.access_token ?? ""} onChange={(v) => update(p.id, { access_token: v })} placeholder="Paste Fast2SMS / Meta token" secret />
                <Field label="Phone Number ID" value={p.phone_number_id ?? ""} onChange={(v) => update(p.id, { phone_number_id: v })} placeholder="Meta Phone Number ID" />
                <Field label="Business Account ID" value={p.business_account_id ?? ""} onChange={(v) => update(p.id, { business_account_id: v })} placeholder="WhatsApp Business Account ID" />
                <Field label="App ID" value={p.app_id ?? ""} onChange={(v) => update(p.id, { app_id: v })} placeholder="Meta App ID" />
                <Field label="App Secret" value={p.app_secret ?? ""} onChange={(v) => update(p.id, { app_secret: v })} placeholder="Meta App Secret" secret />
                <Field label="Webhook Verify Token" value={p.webhook_verify_token ?? ""} onChange={(v) => update(p.id, { webhook_verify_token: v })} placeholder="Your verify token" />
                <Field label="Default Template" value={p.default_template ?? ""} onChange={(v) => update(p.id, { default_template: v })} placeholder="welcome_message" />
                <Field label="Template Namespace" value={p.template_namespace ?? ""} onChange={(v) => update(p.id, { template_namespace: v })} placeholder="optional namespace" />
                <Field label="Quality Rating" value={p.quality_rating ?? ""} onChange={(v) => update(p.id, { quality_rating: v })} placeholder="green / yellow / red" />
              </div>

              <div className="grid sm:grid-cols-[1fr_120px_120px_120px] gap-3 mt-3">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">Assigned Use</label>
                  <select value={p.assigned_use} onChange={(e) => update(p.id, { assigned_use: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none text-sm">
                    {ASSIGNMENTS.map((a) => <option key={a.value} value={a.value} className="bg-[#0F0A05]">{a.label}</option>)}
                  </select>
                </div>
                <Toggle label="Test" value={p.is_test_mode} onChange={(v) => update(p.id, { is_test_mode: v })} />
                <Toggle label="Active" value={p.is_active} onChange={(v) => update(p.id, { is_active: v })} />
                <div className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-black/40 border border-[#d4af37]/30">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">Priority</span>
                  <input type="number" value={p.priority} onChange={(e) => update(p.id, { priority: parseInt(e.target.value) || 0 })} className="w-full bg-transparent text-[#fff8dc] outline-none text-sm font-bold" />
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[#d4af37]/25 bg-black/25 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#f5d97a]/80 font-bold">WhatsApp Templates</p>
                    <p className="text-[9px] text-[#d4af37]/50 mt-0.5">Events ko approved Meta/Fast2SMS template names se map karein</p>
                  </div>
                  <button type="button" onClick={() => addTemplate(p.id)} className="h-8 w-8 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/35 grid place-items-center text-[#f5d97a]" aria-label="Add WhatsApp template">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {getTemplates(p).map((t, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_84px_auto] gap-2 items-start">
                    <input value={t.event} onChange={(e) => updateTemplate(p.id, idx, "event", e.target.value)} placeholder="event" className="px-2.5 py-2 rounded-lg bg-black/40 border border-[#d4af37]/25 text-[#fff8dc] placeholder:text-[#f5d97a]/25 outline-none text-[11px] font-mono" />
                    <input value={t.template_name} onChange={(e) => updateTemplate(p.id, idx, "template_name", e.target.value)} placeholder="template name" className="px-2.5 py-2 rounded-lg bg-black/40 border border-[#d4af37]/25 text-[#fff8dc] placeholder:text-[#f5d97a]/25 outline-none text-[11px] font-mono" />
                    <input value={t.language} onChange={(e) => updateTemplate(p.id, idx, "language", e.target.value)} placeholder="hi" className="px-2.5 py-2 rounded-lg bg-black/40 border border-[#d4af37]/25 text-[#fff8dc] placeholder:text-[#f5d97a]/25 outline-none text-[11px] font-mono" />
                    <button type="button" onClick={() => removeTemplate(p.id, idx)} className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-400/25 grid place-items-center text-red-200" aria-label="Remove template">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <GoldButton onClick={() => save(p)} disabled={savingId === p.id} className="w-full mt-3">
                <Save className="h-3.5 w-3.5 inline mr-1.5" />
                {savingId === p.id ? "Saving..." : "Save WhatsApp Configuration"}
              </GoldButton>
            </GoldCard>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, secret }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; secret?: boolean }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">{label}</label>
      <input type={secret ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] text-xs font-mono" />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-left">
      <span className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">{label}</span>
      <div className={`relative h-5 w-9 rounded-full transition ${value ? "" : "bg-black/60"}`} style={value ? { background: "linear-gradient(180deg,#f5d97a,#d4af37,#8b6508)" } : undefined}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-[18px]" : "left-0.5"}`} />
      </div>
    </button>
  );
}