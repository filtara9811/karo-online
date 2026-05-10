import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, GoldButton, PageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/maps")({
  head: () => ({
    meta: [
      { title: "Maps Providers — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MapsPage,
});

const ASSIGNMENTS = [
  { v: "none", l: "Not Assigned" },
  { v: "geocoding", l: "Geocoding" },
  { v: "reverse_geocoding", l: "Reverse Geocoding" },
  { v: "autocomplete", l: "Places Autocomplete" },
  { v: "nearby", l: "Nearby Search" },
  { v: "directions", l: "Directions / Routing" },
  { v: "static_map", l: "Static Map Image" },
  { v: "all", l: "All (Default Provider)" },
] as const;

type Service = {
  id: string;
  provider: string;
  display_name: string;
  description: string | null;
  api_key: string | null;
  rest_key: string | null;
  map_sdk_key: string | null;
  client_id: string | null;
  client_secret: string | null;
  assigned_use: string;
  is_active: boolean;
  is_test_mode: boolean;
  priority: number;
};

function MapsPage() {
  const [list, setList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("maps_services").select("*").order("priority");
    setList((data ?? []) as Service[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Service>) =>
    setList((p) => p.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const save = async (g: Service) => {
    setSavingId(g.id);
    await (supabase as any).from("maps_services").update({
      api_key: g.api_key, rest_key: g.rest_key, map_sdk_key: g.map_sdk_key,
      client_id: g.client_id, client_secret: g.client_secret,
      assigned_use: g.assigned_use, is_active: g.is_active,
      is_test_mode: g.is_test_mode, priority: g.priority,
    }).eq("id", g.id);
    setSavingId(null);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Maps Providers"
        subtitle="Google Maps & Mappls (MapmyIndia) — geocoding, nearby vendors, directions, hyperlocal discovery"
      />
      <GoldCard className="p-4 mb-4">
        <p className="text-xs text-[#f5d97a]/85 leading-relaxed">
          🗺️ <b className="text-[#fff8dc]">Multi-provider failover:</b> Har use-case ke liye provider assign karein.
          Mappls India me sasta + accurate hai, Google global me strong. App automatically priority order me failover karega.
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
                    style={{ background: "linear-gradient(180deg,#a7f3d0,#10b981,#064e3b)" }}>
                    <MapPin className="h-5 w-5 text-[#0f1c14]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold truncate"
                      style={{ background: "linear-gradient(180deg,#fff8dc,#d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {g.display_name}
                    </h3>
                    {g.description && <p className="text-[10px] text-[#d4af37]/70 mt-0.5 truncate">{g.description}</p>}
                  </div>
                </div>
                <span className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-full font-bold whitespace-nowrap ${g.is_active ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-black/40 text-[#d4af37]/60 border border-[#d4af37]/20"}`}>
                  {g.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="API Key (REST)" value={g.api_key ?? ""} onChange={(v) => update(g.id, { api_key: v })} placeholder="AIzaSy... / mappls_xxx" />
                <Field label="Map SDK Key" value={g.map_sdk_key ?? ""} onChange={(v) => update(g.id, { map_sdk_key: v })} placeholder="for JS/Android/iOS SDK" />
                {g.provider === "mappls" && (
                  <>
                    <Field label="Client ID" value={g.client_id ?? ""} onChange={(v) => update(g.id, { client_id: v })} placeholder="mappls client id" />
                    <Field label="Client Secret" value={g.client_secret ?? ""} onChange={(v) => update(g.id, { client_secret: v })} placeholder="••••••••••" />
                  </>
                )}
              </div>

              <div className="mt-3">
                <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">Assigned Use</label>
                <select value={g.assigned_use} onChange={(e) => update(g.id, { assigned_use: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-sm">
                  {ASSIGNMENTS.map((a) => (
                    <option key={a.v} value={a.v} className="bg-[#0F0A05]">{a.l}</option>
                  ))}
                </select>
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
