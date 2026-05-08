import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, CheckCircle2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminLayout,
  GoldCard,
  PageHeader,
  GoldButton,
} from "@/components/admin/AdminLayout";
import {
  listProviders,
  setActiveProvider,
  updateProvider,
  type IntegrationProvider,
} from "@/lib/integrations";

export const Route = createFileRoute("/admin/integrations/maps")({
  head: () => ({
    meta: [
      { title: "Maps Providers — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MapsIntegrationPage,
});

function MapsIntegrationPage() {
  const [items, setItems] = useState<IntegrationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = await listProviders("maps");
      setItems(list);
      const seed: Record<string, Record<string, string>> = {};
      for (const p of list) {
        const cfg = (p.config ?? {}) as Record<string, unknown>;
        const obj: Record<string, string> = {};
        for (const [k, v] of Object.entries(cfg)) obj[k] = String(v ?? "");
        seed[p.id] = obj;
      }
      setEditing(seed);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("integration-providers-maps")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "integration_providers" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onActivate = async (id: string) => {
    try {
      await setActiveProvider(id);
      toast.success("Active provider switched");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not switch");
    }
  };

  const onToggleTest = async (p: IntegrationProvider) => {
    try {
      await updateProvider(p.id, { is_test_mode: !p.is_test_mode });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const onSaveConfig = async (id: string) => {
    setSaving(id);
    try {
      await updateProvider(id, { config: editing[id] ?? {} });
      toast.success("Configuration saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  };

  return (
    <AdminLayout>
      <Link
        to="/admin/integrations"
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/70 hover:text-[#d4af37] mb-3"
      >
        <ArrowLeft className="h-3 w-3" /> Integrations Hub
      </Link>

      <PageHeader
        title="Maps & Hyperlocal"
        subtitle="Active provider switch karein. Demo mode mein keys blank ho sakti hain."
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((p) => {
            const cfg = editing[p.id] ?? {};
            const fields = Object.keys(cfg);
            return (
              <GoldCard key={p.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
                      style={{
                        background:
                          "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)",
                      }}
                    >
                      <MapPin className="h-5 w-5 text-[#1a1208]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className="font-display text-lg font-bold"
                          style={{
                            background:
                              "linear-gradient(180deg,#fff8dc,#d4af37)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          {p.display_name}
                        </h3>
                        {p.is_active && (
                          <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        )}
                        <span
                          className={`text-[9px] uppercase tracking-[0.25em] font-bold px-2 py-0.5 rounded-full border ${
                            p.is_test_mode
                              ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
                              : "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                          }`}
                        >
                          {p.is_test_mode ? "Test / Demo" : "Live"}
                        </span>
                      </div>
                      {p.notes && (
                        <p className="text-[11px] text-[#f5d97a]/60 mt-1">
                          {p.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <GoldButton
                      size="sm"
                      variant="outline"
                      onClick={() => onToggleTest(p)}
                    >
                      {p.is_test_mode ? "Mark Live" : "Mark Test"}
                    </GoldButton>
                    {!p.is_active && (
                      <GoldButton size="sm" onClick={() => onActivate(p.id)}>
                        Make Active
                      </GoldButton>
                    )}
                  </div>
                </div>

                {fields.length === 0 ? (
                  <p className="text-[11px] text-[#f5d97a]/50 italic">
                    No configurable fields for this provider.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      {fields.map((k) => (
                        <label key={k} className="block">
                          <span className="text-[9px] uppercase tracking-[0.25em] text-[#d4af37]/70 font-bold">
                            {k}
                          </span>
                          <input
                            type="text"
                            value={cfg[k]}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [p.id]: { ...(prev[p.id] ?? {}), [k]: e.target.value },
                              }))
                            }
                            placeholder={
                              p.is_test_mode ? "Demo / blank OK" : "Enter value"
                            }
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-sm placeholder:text-[#d4af37]/30 focus:outline-none focus:border-[#d4af37]"
                          />
                        </label>
                      ))}
                    </div>
                    <GoldButton
                      size="sm"
                      onClick={() => onSaveConfig(p.id)}
                      disabled={saving === p.id}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Save className="h-3 w-3" />
                        {saving === p.id ? "Saving…" : "Save Config"}
                      </span>
                    </GoldButton>
                  </>
                )}
              </GoldCard>
            );
          })}
        </div>
      )}

      <GoldCard className="mt-6 p-4">
        <p className="text-[11px] text-[#f5d97a]/70 leading-relaxed">
          <b>Note:</b> Demo mode mein customer app abhi bhi free OpenStreetMap
          use karega. Jab Google ya Mappls keys add karke "Mark Live" + "Make
          Active" kar denge, tab us provider ka tile/SDK use hoga. Existing
          location detection (browser geolocation) jaisa hai waisa hi rahega.
        </p>
      </GoldCard>
    </AdminLayout>
  );
}
