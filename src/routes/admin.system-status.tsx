import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, PageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/system-status")({
  head: () => ({
    meta: [
      { title: "System Status — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminLayout>
      <SystemStatusPage />
    </AdminLayout>
  ),
});

type GatewayHealth = {
  provider: string;
  display_name: string;
  is_active: boolean;
  is_test_mode: boolean;
  last_error: string | null;
  last_error_meta?: Record<string, unknown> | null;
  last_error_at: string | null;
  last_success_at: string | null;
};
type Health = {
  sms: GatewayHealth[];
  payment: GatewayHealth[];
  recent_errors: { id: string; kind: string; provider: string | null; message: string; meta?: Record<string, unknown> | null; created_at: string }[];
};

function fullJson(meta?: Record<string, unknown> | null) {
  if (!meta) return "";
  const response = meta.provider_response ?? meta;
  try {
    return JSON.stringify(response, null, 2);
  } catch {
    return String(response);
  }
}

function fmt(t: string | null) {
  if (!t) return "—";
  const d = new Date(t);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString();
}

function SystemStatusPage() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: rpcData, error } = await supabase.rpc("get_gateway_health" as any);
    if (!error && rpcData) setData(rpcData as Health);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <PageHeader
        title="System Status"
        subtitle="Live health of SMS & Payment gateways"
      />

      <div className="flex justify-end mb-3">
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-xs hover:border-[#d4af37]"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <GoldCard className="p-16 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </GoldCard>
      ) : (
        <div className="space-y-6">
          <Section title="SMS Gateways" rows={data?.sms ?? []} />
          <Section title="Payment Gateways" rows={data?.payment ?? []} />

          <GoldCard className="p-5">
            <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Recent Errors (50)
            </h3>
            {(data?.recent_errors ?? []).length === 0 ? (
              <p className="text-xs text-[#f5d97a]/60">No recent errors. All gateways healthy.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {data?.recent_errors.map((e) => (
                  <div key={e.id} className="text-[11px] p-2 rounded bg-black/30 border border-red-500/20">
                    <div className="flex justify-between text-[10px] text-[#f5d97a]/60 mb-1">
                      <span>{e.kind} · {e.provider ?? "—"}</span>
                      <span>{fmt(e.created_at)}</span>
                    </div>
                    <div className="text-red-300/90 font-mono break-words">{e.message}</div>
                    {e.meta && (
                      <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/35 p-2 text-[10px] text-red-100/80 whitespace-pre-wrap">
                        Full JSON Response: {fullJson(e.meta)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GoldCard>
        </div>
      )}
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: GatewayHealth[] }) {
  return (
    <div>
      <h3 className="text-sm uppercase tracking-widest text-[#d4af37] font-bold mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4" />
        {title}
      </h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {rows.map((g) => {
          const healthy = g.is_active && (!g.last_error_at || (g.last_success_at && g.last_success_at > g.last_error_at));
          return (
            <GoldCard key={g.provider} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-display text-base text-[#fff8dc]">{g.display_name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#d4af37]/60">{g.provider}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {g.is_active ? (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-black/40 text-[#d4af37]/60 border border-[#d4af37]/20">
                      Inactive
                    </span>
                  )}
                  {g.is_test_mode && (
                    <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                      Test mode
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2 text-[#f5d97a]/80">
                  <Clock className="h-3 w-3" />
                  Last success: <span className="text-[#fff8dc]">{fmt(g.last_success_at)}</span>
                </div>
                {g.last_error_at && (
                  <div className="text-red-300/90">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      Last error: {fmt(g.last_error_at)}
                    </div>
                    <div className="font-mono text-[10px] mt-1 text-red-300/70 break-words">
                      {g.last_error}
                    </div>
                    {g.last_error_meta && (
                      <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/35 p-2 font-mono text-[10px] text-red-100/75 whitespace-pre-wrap">
                        Full JSON Response: {fullJson(g.last_error_meta)}
                      </pre>
                    )}
                  </div>
                )}
                {!g.is_active && (
                  <div className="text-[#f5d97a]/50 italic">Activate this gateway in admin settings.</div>
                )}
                {healthy && (
                  <div className="text-emerald-300/80 text-[10px]">✓ Healthy</div>
                )}
              </div>
            </GoldCard>
          );
        })}
        {rows.length === 0 && (
          <p className="text-xs text-[#f5d97a]/60">No gateways configured.</p>
        )}
      </div>
    </div>
  );
}
