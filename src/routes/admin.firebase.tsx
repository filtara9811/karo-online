import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, GoldButton, PageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/firebase")({
  head: () => ({
    meta: [
      { title: "Firebase Services — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FirebaseServicesPage,
});

type Service = {
  id: string;
  service_key: string;
  display_name: string;
  description: string | null;
  project_id: string | null;
  app_id: string | null;
  sender_id: string | null;
  web_api_key: string | null;
  server_key: string | null;
  service_account_json: string | null;
  is_active: boolean;
  is_test_mode: boolean;
  priority: number;
};

function FirebaseServicesPage() {
  const [list, setList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("firebase_services").select("*").order("priority");
    setList((data ?? []) as Service[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Service>) =>
    setList((p) => p.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const save = async (g: Service) => {
    setSavingId(g.id);
    await (supabase as any).from("firebase_services").update({
      project_id: g.project_id,
      app_id: g.app_id,
      sender_id: g.sender_id,
      web_api_key: g.web_api_key,
      server_key: g.server_key,
      service_account_json: g.service_account_json,
      is_active: g.is_active,
      is_test_mode: g.is_test_mode,
      priority: g.priority,
    }).eq("id", g.id);
    setSavingId(null);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Firebase Services"
        subtitle="Authentication, Cloud Messaging, Analytics, Crashlytics, Dynamic Links & Remote Config — sab ek jagah configure karein"
      />
      <GoldCard className="p-4 mb-4">
        <p className="text-xs text-[#f5d97a]/85 leading-relaxed">
          🔥 <b className="text-[#fff8dc]">Smart Routing:</b> Har Firebase service ke alag credentials configure karein.
          FCM se push notifications, Crashlytics se crash reports, Remote Config se runtime flags — sab automatically use honge.
        </p>
      </GoldCard>

      {loading ? (
        <GoldCard className="p-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </GoldCard>
      ) : (
        <div className="grid gap-4">
          {list.map((g) => (
            <GoldCard key={g.id} className="p-5">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
                    style={{ background: "linear-gradient(180deg,#ffb648,#ff7a18,#a13b00)" }}>
                    <Flame className="h-5 w-5 text-[#1a1208]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold truncate"
                      style={{ background: "linear-gradient(180deg,#fff8dc,#d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {g.display_name}
                    </h3>
                    {g.description && (
                      <p className="text-[10px] text-[#d4af37]/70 mt-0.5 truncate">{g.description}</p>
                    )}
                  </div>
                </div>
                <span className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-full font-bold whitespace-nowrap ${g.is_active ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-black/40 text-[#d4af37]/60 border border-[#d4af37]/20"}`}>
                  {g.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Project ID" value={g.project_id ?? ""} onChange={(v) => update(g.id, { project_id: v })} placeholder="my-project-id" />
                <Field label="App ID" value={g.app_id ?? ""} onChange={(v) => update(g.id, { app_id: v })} placeholder="1:1234:web:abcd" />
                <Field label="Sender ID" value={g.sender_id ?? ""} onChange={(v) => update(g.id, { sender_id: v })} placeholder="123456789" />
                <Field label="Web API Key" value={g.web_api_key ?? ""} onChange={(v) => update(g.id, { web_api_key: v })} placeholder="AIzaSy..." />
              </div>

              {g.service_key === "fcm" && (
                <div className="mt-3">
                  <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">Server Key (Legacy)</label>
                  <input type="password" value={g.server_key ?? ""} onChange={(e) => update(g.id, { server_key: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs font-mono" />
                </div>
              )}

              <div className="mt-3">
                <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">Service Account JSON</label>
                <textarea rows={4} value={g.service_account_json ?? ""} onChange={(e) => update(g.id, { service_account_json: e.target.value })}
                  placeholder='{"type":"service_account", ...}'
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-[11px] font-mono" />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <Toggle label="Test" value={g.is_test_mode} onChange={(v) => update(g.id, { is_test_mode: v })} />
                <Toggle label="Active" value={g.is_active} onChange={(v) => update(g.id, { is_active: v })} />
                <div className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-black/40 border border-[#d4af37]/30">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">Priority</span>
                  <input type="number" value={g.priority} onChange={(e) => update(g.id, { priority: parseInt(e.target.value) || 0 })}
                    className="w-full bg-transparent text-[#fff8dc] outline-none text-sm font-bold" />
                </div>
              </div>

              <GoldButton onClick={() => save(g)} disabled={savingId === g.id} className="w-full mt-3">
                <Save className="h-3.5 w-3.5 inline mr-1.5" />
                {savingId === g.id ? "Saving..." : "Save Configuration"}
              </GoldButton>
            </GoldCard>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] text-xs font-mono" />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-left">
      <span className="text-[10px] uppercase tracking-[0.2em] text-[#f5d97a]/80 font-bold">{label}</span>
      <div className={`relative h-5 w-9 rounded-full transition ${value ? "" : "bg-black/60"}`}
        style={value ? { background: "linear-gradient(180deg,#f5d97a,#d4af37,#8b6508)" } : undefined}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-[18px]" : "left-0.5"}`} />
      </div>
    </button>
  );
}
