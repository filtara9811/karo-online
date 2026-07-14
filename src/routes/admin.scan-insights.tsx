import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getScanInsights, type ScanInsights } from "@/lib/scan-history.functions";
import { AdminLayout, GoldCard, PageHeader } from "@/components/admin/AdminLayout";
import { ConfidencePill } from "@/components/vendor-join/ConfidenceBadge";
import { Loader2, ScanLine, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/scan-insights")({
  head: () => ({
    meta: [
      { title: "Scan Insights — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ScanInsightsPage,
});

const FIELD_ORDER = [
  "business_name", "owner_name", "mobile", "address",
  "city", "state", "pincode", "gstin", "email", "shop_type_hint",
];
const FIELD_LABEL: Record<string, string> = {
  business_name: "Business",
  owner_name: "Owner",
  mobile: "Mobile",
  address: "Address",
  city: "City",
  state: "State",
  pincode: "Pincode",
  gstin: "GSTIN",
  email: "Email",
  shop_type_hint: "Category",
};

function ScanInsightsPage() {
  const [data, setData] = useState<ScanInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useServerFn(getScanInsights);

  useEffect(() => {
    setLoading(true);
    run()
      .then((r) => setData(r))
      .catch((e) => toast.error((e as Error).message || "Insights load failed"))
      .finally(() => setLoading(false));
  }, [run]);

  return (
    <AdminLayout>
      <PageHeader
        title="Scan Insights"
        subtitle="OCR data quality & vendor onboarding performance"
      />

      {loading && (
        <div className="py-12 flex items-center justify-center gap-2 text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading insights…
        </div>
      )}

      {!loading && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Today" value={data.today} icon={<ScanLine className="h-4 w-4" />} />
            <StatCard label="Last 7 days" value={data.last7d} icon={<TrendingUp className="h-4 w-4" />} />
            <StatCard label="Last 30 days" value={data.last30d} icon={<TrendingUp className="h-4 w-4" />} />
            <StatCard label="Total scans" value={data.total} icon={<ScanLine className="h-4 w-4" />} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <GoldCard>
              <div className="p-4">
                <div className="text-xs uppercase text-neutral-500 font-bold mb-1">
                  Average confidence
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-extrabold">
                    {data.avgConfidence == null ? "—" : `${Math.round(data.avgConfidence * 100)}%`}
                  </div>
                  {data.avgConfidence != null && <ConfidencePill score={data.avgConfidence} size="md" />}
                </div>
              </div>
            </GoldCard>
            <GoldCard>
              <div className="p-4">
                <div className="text-xs uppercase text-neutral-500 font-bold mb-1">
                  Empty scans (nothing extracted)
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-extrabold">
                    {Math.round(data.emptyRate * 100)}%
                  </div>
                  {data.emptyRate > 0.2 ? (
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
              </div>
            </GoldCard>
          </div>

          <GoldCard>
            <div className="p-4">
              <div className="text-xs uppercase text-neutral-500 font-bold mb-3">
                Field fill rate (how often each field is detected)
              </div>
              <div className="space-y-2">
                {FIELD_ORDER.map((k) => {
                  const rate = data.fieldFillRate[k] ?? 0;
                  const pct = Math.round(rate * 100);
                  const color =
                    rate >= 0.7 ? "bg-emerald-500" : rate >= 0.4 ? "bg-amber-500" : "bg-rose-500";
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <div className="w-24 text-xs font-bold text-neutral-700">{FIELD_LABEL[k]}</div>
                      <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-10 text-right text-xs font-extrabold text-neutral-700">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GoldCard>

          <GoldCard>
            <div className="p-4">
              <div className="text-xs uppercase text-neutral-500 font-bold mb-3">
                Recent scans
              </div>
              {data.recent.length === 0 && (
                <div className="text-sm text-neutral-500 py-4 text-center">No scans yet</div>
              )}
              <div className="space-y-2">
                {data.recent.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-2.5">
                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                      {r.thumbnail ? (
                        <img src={r.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-neutral-400">
                          <ScanLine className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-neutral-900 truncate">
                        {r.business_name ?? "Untitled"}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate">
                        {[r.mobile, ...(r.kinds ?? [])].filter(Boolean).join(" · ")} ·{" "}
                        {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                    {r.confidence != null && <ConfidencePill score={r.confidence} />}
                  </div>
                ))}
              </div>
            </div>
          </GoldCard>
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <GoldCard>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase text-neutral-500 font-bold mb-1">
          {icon}
          {label}
        </div>
        <div className="text-3xl font-extrabold">{value}</div>
      </div>
    </GoldCard>
  );
}
