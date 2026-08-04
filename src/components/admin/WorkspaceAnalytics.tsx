import { useEffect, useState } from "react";
import { Users, Store, Activity, ScanLine, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoldCard } from "./AdminLayout";
import { useWorkspaces, WORKSPACE_ICONS, type WorkspaceKey } from "./workspaces";

type Metric = { label: string; value: number; icon: typeof Users };

async function count(table: string, apply?: (q: any) => any) {
  try {
    let q: any = supabase.from(table as any).select("id", { count: "exact", head: true });
    if (apply) q = apply(q);
    const { count: c } = await q;
    return c ?? 0;
  } catch {
    return 0;
  }
}

async function distinctCount(table: string, column: string) {
  try {
    const { data } = await supabase.from(table as any).select(column).limit(5000);
    const set = new Set((data ?? []).map((r: any) => r[column]).filter(Boolean));
    return set.size;
  } catch {
    return 0;
  }
}

async function loadMetrics(key: WorkspaceKey): Promise<Metric[]> {
  if (key === "one_qr") {
    const [customers, vendors, scans, visits] = await Promise.all([
      distinctCount("vendor_customer_visits", "customer_identity_id"),
      distinctCount("merchant_link_settings", "vendor_id"),
      count("qr_scans"),
      count("referral_link_visits"),
    ]);
    return [
      { label: "QR Customers", value: customers, icon: Users },
      { label: "QR Vendors", value: vendors, icon: Store },
      { label: "QR Scans", value: scans, icon: ScanLine },
      { label: "Link Visits", value: visits, icon: Activity },
    ];
  }
  if (key === "quick_service") {
    const [customers, vendors, leads, accepted] = await Promise.all([
      distinctCount("leads", "customer_id"),
      distinctCount("lead_notifications", "vendor_id"),
      count("leads"),
      count("lead_notifications", (q) => q.eq("status", "accepted")),
    ]);
    return [
      { label: "Service Customers", value: customers, icon: Users },
      { label: "Service Vendors", value: vendors, icon: Store },
      { label: "Total Requests", value: leads, icon: Activity },
      { label: "Accepted", value: accepted, icon: Activity },
    ];
  }
  if (key === "digital_shop") {
    const [customers, vendors, items, orders] = await Promise.all([
      distinctCount("vendor_customer_visits", "customer_identity_id"),
      distinctCount("vendor_item_mappings", "vendor_id"),
      count("vendor_item_mappings", (q) => q.eq("is_active", true)),
      count("leads", (q) => q.eq("is_marketplace", true)),
    ]);
    return [
      { label: "Shop Customers", value: customers, icon: Users },
      { label: "Shop Vendors", value: vendors, icon: Store },
      { label: "Listed Items", value: items, icon: Activity },
      { label: "Marketplace Orders", value: orders, icon: Activity },
    ];
  }
  if (key === "ai_ocr") {
    const [scanUsers, scans, cardLeads, joined] = await Promise.all([
      distinctCount("vendor_scan_history", "user_id"),
      count("vendor_scan_history"),
      count("referral_scan_leads"),
      count("referral_scan_leads", (q) => q.not("joined_at", "is", null)),
    ]);
    return [
      { label: "OCR Users", value: scanUsers, icon: Users },
      { label: "Total Scans", value: scans, icon: ScanLine },
      { label: "Card Leads", value: cardLeads, icon: Activity },
      { label: "Joined as Vendor", value: joined, icon: Store },
    ];
  }
  return [];
}

export function WorkspaceAnalytics() {
  const { active } = useWorkspaces();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    loadMetrics(active.key)
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, [active?.key]);

  if (!active) return null;
  const Icon = WORKSPACE_ICONS[active.icon] ?? WORKSPACE_ICONS.custom;

  return (
    <GoldCard className="p-5 mb-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-9 w-9 rounded-xl grid place-items-center"
          style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37, #8b6508)" }}
        >
          <Icon className="h-4 w-4 text-[#1a1208]" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-[#fff8dc]">{active.title}</h3>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/60">
            Workspace analytics
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 grid place-items-center text-[#d4af37]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : metrics.length === 0 ? (
        <p className="text-xs text-[#f5d97a]/60">
          Custom workspace — connect a module to see its customers & vendors here.
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border px-3 py-3"
              style={{
                background: "rgba(212,175,55,0.07)",
                borderColor: "rgba(212,175,55,0.25)",
              }}
            >
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#f5d97a]/70">
                <m.icon className="h-3 w-3" />
                {m.label}
              </div>
              <p className="font-display text-2xl font-bold text-[#fff8dc] mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      )}
    </GoldCard>
  );
}
