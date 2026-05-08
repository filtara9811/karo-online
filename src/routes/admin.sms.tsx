import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare, Loader2, Save, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AdminLayout,
  GoldCard,
  GoldButton,
  PageHeader,
} from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/sms")({
  head: () => ({
    meta: [
      { title: "SMS Gateways — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminLayout>
      <SmsPage />
    </AdminLayout>
  ),
});

type SmsGateway = {
  id: string;
  provider: "msg91" | "fast2sms" | string;
  display_name: string;
  is_active: boolean;
  is_test_mode: boolean;
  config: Record<string, any>;
};

type SmsTemplate = {
  event: string;
  label: string;
  template_id: string;
  variables: string;
};

const FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string; help?: string }>> = {
  msg91: [
    { key: "auth_key", label: "Auth Key", placeholder: "MSG91 Auth Key", help: "MSG91 dashboard → Auth Key" },
    { key: "sender_id", label: "Sender ID", placeholder: "KARONL", help: "6-letter DLT-approved sender" },
    { key: "route", label: "Route", placeholder: "4" },
    { key: "country", label: "Country Code", placeholder: "91" },
  ],
  fast2sms: [
    { key: "api_key", label: "API Key", placeholder: "Fast2SMS Authorization key", help: "Fast2SMS dashboard → Dev API" },
    { key: "sender_id", label: "Sender ID", placeholder: "FILPRA", help: "DLT-approved 6-letter header" },
    { key: "route", label: "Route", placeholder: "dlt", help: "otp / dlt / q (use 'dlt' for DLT templates)" },
    { key: "message_id", label: "Message ID (optional)", placeholder: "", help: "Some Fast2SMS DLT setups need this; leave blank if not provided" },
  ],
};

const defaultTemplate = (): SmsTemplate => ({ event: "otp", label: "OTP Login", template_id: "", variables: "{otp}" });

function SmsPage() {
  const [gateways, setGateways] = useState<SmsGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sms_gateways" as any)
      .select("*")
      .order("provider");
    setGateways(((data ?? []) as any[]).map((g) => ({
      ...g,
      config: (g.config ?? {}) as Record<string, any>,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<SmsGateway>) => {
    setGateways((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const updateConfig = (id: string, key: string, value: string) => {
    setGateways((prev) =>
      prev.map((g) => (g.id === id ? { ...g, config: { ...g.config, [key]: value } } : g))
    );
  };

  const getTemplates = (g: SmsGateway): SmsTemplate[] => {
    const templates = Array.isArray(g.config.templates) ? g.config.templates : [];
    if (templates.length > 0) return templates as SmsTemplate[];
    return [{ ...defaultTemplate(), template_id: g.config.template_id ?? "" }];
  };

  const updateTemplate = (id: string, idx: number, key: keyof SmsTemplate, value: string) => {
    setGateways((prev) => prev.map((g) => {
      if (g.id !== id) return g;
      const templates = getTemplates(g).map((t, i) => (i === idx ? { ...t, [key]: value } : t));
      return { ...g, config: { ...g.config, templates, template_id: templates[0]?.template_id ?? g.config.template_id } };
    }));
  };

  const addTemplate = (id: string) => {
    setGateways((prev) => prev.map((g) => {
      if (g.id !== id) return g;
      const templates = [...getTemplates(g), { ...defaultTemplate(), event: "", label: "" }];
      return { ...g, config: { ...g.config, templates } };
    }));
  };

  const removeTemplate = (id: string, idx: number) => {
    setGateways((prev) => prev.map((g) => {
      if (g.id !== id) return g;
      const templates = getTemplates(g).filter((_, i) => i !== idx);
      const safeTemplates = templates.length ? templates : [defaultTemplate()];
      return { ...g, config: { ...g.config, templates: safeTemplates, template_id: safeTemplates[0]?.template_id ?? "" } };
    }));
  };

  const save = async (g: SmsGateway) => {
    setSavingId(g.id);
    const { data: sess } = await supabase.auth.getUser();
    const templates = getTemplates(g).filter((t) => t.event.trim() || t.label.trim() || t.template_id.trim());
    const config = { ...g.config, templates, template_id: templates[0]?.template_id ?? g.config.template_id ?? "" };
    const { error } = await supabase
      .from("sms_gateways" as any)
      .update({
        is_active: g.is_active,
        is_test_mode: g.is_test_mode,
        config,
        updated_by: sess.user?.id,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", g.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`${g.display_name} saved`);
    load();
  };

  return (
    <div>
      <PageHeader
        title="SMS Gateways"
        subtitle="OTP bhejne ke liye provider — sirf ek active rahega"
      />

      {loading ? (
        <GoldCard className="p-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </GoldCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {gateways.map((g) => {
            const fields = FIELDS[g.provider] ?? [];
            return (
              <GoldCard key={g.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-11 w-11 rounded-xl grid place-items-center"
                      style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
                    >
                      <MessageSquare className="h-5 w-5 text-[#1a1208]" />
                    </div>
                    <div>
                      <h3
                        className="font-display text-lg font-bold flex items-center gap-2"
                        style={{
                          background: "linear-gradient(180deg, #fff8dc, #d4af37)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {g.display_name}
                        {g.is_active && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        )}
                      </h3>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]/60">
                        {g.provider}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${
                      g.is_active
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-black/40 text-[#d4af37]/60 border border-[#d4af37]/20"
                    }`}
                  >
                    {g.is_active ? "ACTIVE" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-3">
                  {fields.map((f) => (
                    <div key={f.key}>
                      <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
                        {f.label}
                      </label>
                      <input
                        value={g.config[f.key] ?? ""}
                        onChange={(e) => updateConfig(g.id, f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] text-xs font-mono"
                      />
                      {f.help && (
                        <p className="text-[9px] text-[#d4af37]/50 mt-1">{f.help}</p>
                      )}
                    </div>
                  ))}

                  <div className="rounded-xl border border-[#d4af37]/25 bg-black/25 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#f5d97a]/80 font-bold">DLT Templates</p>
                        <p className="text-[9px] text-[#d4af37]/50 mt-0.5">OTP, login, payment jaise events ke approved IDs</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addTemplate(g.id)}
                        className="h-8 w-8 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/35 grid place-items-center text-[#f5d97a]"
                        aria-label="Add DLT template"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {getTemplates(g).map((t, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                        <input
                          value={t.event}
                          onChange={(e) => updateTemplate(g.id, idx, "event", e.target.value)}
                          placeholder="event: otp"
                          className="px-2.5 py-2 rounded-lg bg-black/40 border border-[#d4af37]/25 text-[#fff8dc] placeholder:text-[#f5d97a]/25 outline-none text-[11px] font-mono"
                        />
                        <input
                          value={t.template_id}
                          onChange={(e) => updateTemplate(g.id, idx, "template_id", e.target.value)}
                          placeholder="Template ID"
                          className="px-2.5 py-2 rounded-lg bg-black/40 border border-[#d4af37]/25 text-[#fff8dc] placeholder:text-[#f5d97a]/25 outline-none text-[11px] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => removeTemplate(g.id, idx)}
                          className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-400/25 grid place-items-center text-red-200"
                          aria-label="Remove DLT template"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <input
                          value={t.variables || "{otp}"}
                          onChange={(e) => updateTemplate(g.id, idx, "variables", e.target.value)}
                          placeholder="variables: {otp}"
                          className="col-span-3 px-2.5 py-2 rounded-lg bg-black/40 border border-[#d4af37]/25 text-[#fff8dc] placeholder:text-[#f5d97a]/25 outline-none text-[11px] font-mono"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Toggle
                      label="Test mode"
                      value={g.is_test_mode}
                      onChange={(v) => update(g.id, { is_test_mode: v })}
                    />
                    <Toggle
                      label="Active"
                      value={g.is_active}
                      onChange={(v) => update(g.id, { is_active: v })}
                    />
                  </div>

                  <GoldButton
                    onClick={() => save(g)}
                    disabled={savingId === g.id}
                    className="w-full mt-2"
                  >
                    <Save className="h-3.5 w-3.5 inline mr-1.5" />
                    {savingId === g.id ? "Saving..." : "Save Configuration"}
                  </GoldButton>
                </div>
              </GoldCard>
            );
          })}
        </div>
      )}

      <GoldCard className="p-4 mt-5 max-w-2xl">
        <p className="text-[11px] text-[#f5d97a]/70 leading-relaxed">
          📲 <strong className="text-[#fff8dc]">Kaise kaam karta hai:</strong> Jo gateway "Active" hoga
          uske keys se OTP bhejega. Ek samay par sirf ek active rah sakta hai —
          dusra activate karte hi pehla automatic inactive ho jayega. Test mode
          ON ho to live OTP block rahega. Launch ke liye Test mode OFF rakhein.
        </p>
      </GoldCard>
    </div>
  );
}

function Toggle({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-left"
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">
        {label}
      </span>
      <div
        className={`relative h-5 w-9 rounded-full transition ${value ? "" : "bg-black/60"}`}
        style={value ? { background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" } : undefined}
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}
