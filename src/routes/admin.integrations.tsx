import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plug, Settings2, CheckCircle2, XCircle } from "lucide-react";
import { AdminLayout, PageHeader, GoldCard, GoldButton } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

type Module = {
  id: string;
  module_key: string;
  category: string;
  display_name: string;
  description: string | null;
  is_enabled: boolean;
  is_configured: boolean;
  config: Record<string, unknown>;
  status: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  auth_push: "Auth & Push",
  kyc: "KYC",
  maps: "Maps & Geo",
  messaging: "Messaging",
  analytics: "Analytics",
  crm: "CRM",
  vendor: "Vendor",
  automation: "Automation",
  security: "Security",
  ai: "AI",
};

function IntegrationsPage() {
  const [rows, setRows] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Module | null>(null);
  const [draftJson, setDraftJson] = useState("{}");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("integration_modules")
      .select("*")
      .order("category", { ascending: true });
    setRows((data ?? []) as Module[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Module[]>();
    rows.forEach((r) => {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    });
    return Array.from(map.entries());
  }, [rows]);

  const toggle = async (m: Module) => {
    await supabase
      .from("integration_modules")
      .update({ is_enabled: !m.is_enabled })
      .eq("id", m.id);
    load();
  };

  const openConfig = (m: Module) => {
    setEditing(m);
    setDraftJson(JSON.stringify(m.config ?? {}, null, 2));
  };

  const saveConfig = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const parsed = JSON.parse(draftJson || "{}");
      const isConfigured = Object.keys(parsed).length > 0;
      await supabase
        .from("integration_modules")
        .update({ config: parsed, is_configured: isConfigured })
        .eq("id", editing.id);
      setEditing(null);
      load();
    } catch (e) {
      alert("Invalid JSON: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Integrations Hub"
        subtitle="Extension modules — enable, configure, and monitor without touching existing systems"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([cat, list]) => (
            <section key={cat}>
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/80 font-bold mb-3">
                {CATEGORY_LABEL[cat] ?? cat}
              </h3>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {list.map((m) => (
                  <GoldCard key={m.id} className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Plug className="h-4 w-4 text-[#f5d97a] shrink-0" />
                        <h4 className="font-display text-lg text-[#fff8dc] truncate">
                          {m.display_name}
                        </h4>
                      </div>
                      <button
                        onClick={() => toggle(m)}
                        className={`relative h-6 w-11 rounded-full transition shrink-0 ${
                          m.is_enabled ? "bg-[#d4af37]" : "bg-white/10"
                        }`}
                        aria-label="Toggle module"
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            m.is_enabled ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-[#f5d97a]/60 mb-4 min-h-[2.5rem]">
                      {m.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest mb-4">
                      <span className="flex items-center gap-1 text-[#f5d97a]/70">
                        {m.is_configured ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            Configured
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-red-400" />
                            No keys
                          </>
                        )}
                      </span>
                      <span className="text-[#f5d97a]/50">
                        {m.is_enabled ? "ON" : "OFF"}
                      </span>
                    </div>
                    <GoldButton
                      variant="outline"
                      size="sm"
                      onClick={() => openConfig(m)}
                      className="w-full"
                    >
                      <Settings2 className="h-3 w-3 inline mr-1" />
                      Configure
                    </GoldButton>
                  </GoldCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Config modal */}
      {editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditing(null)}
          />
          <div className="relative w-full max-w-xl rounded-2xl border border-[#d4af37]/40 bg-[oklch(0.10_0.02_80)] p-6">
            <h3 className="font-display text-xl text-[#fff8dc] mb-1">
              {editing.display_name}
            </h3>
            <p className="text-xs text-[#f5d97a]/60 mb-4">
              Paste API keys / config as JSON. Stored securely; only admins can read.
            </p>
            <textarea
              value={draftJson}
              onChange={(e) => setDraftJson(e.target.value)}
              rows={12}
              className="w-full rounded-xl bg-black/40 border border-[#d4af37]/30 px-4 py-3 text-sm font-mono text-[#fff8dc] outline-none focus:border-[#d4af37]"
              spellCheck={false}
            />
            <div className="flex justify-end gap-2 mt-4">
              <GoldButton variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </GoldButton>
              <GoldButton onClick={saveConfig} disabled={saving}>
                {saving ? "Saving..." : "Save Config"}
              </GoldButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const Route = createFileRoute("/admin/integrations")({
  component: () => (
    <AdminLayout>
      <IntegrationsPage />
    </AdminLayout>
  ),
});
