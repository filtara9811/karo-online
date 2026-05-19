import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { Store, Mail, Phone, ShieldCheck } from "lucide-react";
import { AdminLayout, GoldCard, PageHeader } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AdminListToolbar,
  applyFilters,
  downloadCsv,
  downloadPdf,
  emptyFilters,
  type ListFilters,
} from "@/components/admin/AdminListToolbar";
import { AdminRecordDrawer, type AdminRecord } from "@/components/admin/AdminRecordDrawer";

export const Route = createFileRoute("/admin/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VendorsPage,
});

type Vendor = AdminRecord & {
  role: string | null;
  owner_name: string | null;
  entity: string | null;
  trade: string | null;
  deals_in: string | null;
  business_name: string | null;
  whatsapp: string | null;
  manager_email: string | null;
  referral: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  aadhaar: string | null;
  pan: string | null;
  gst: string | null;
  plan: string | null;
};

function VendorsPage() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ListFilters>(emptyFilters);
  const [active, setActive] = useState<Vendor | null>(null);
  const navigate = useNavigate();


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Vendors load fail");
    else setRows((data as Vendor[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Sync drawer record after refresh
  useEffect(() => {
    if (!active) return;
    const fresh = rows.find((r) => r.id === active.id);
    if (fresh && fresh !== active) setActive(fresh);
  }, [rows]);

  const filtered = useMemo(
    () =>
      applyFilters(rows, filters, (v) => [
        v.business_name ?? "",
        v.owner_name ?? "",
        v.manager_email ?? "",
        v.whatsapp ?? "",
        v.trade ?? "",
        v.deals_in ?? "",
        ...(v.tags ?? []),
      ]),
    [rows, filters],
  );

  const exportRows = () =>
    filtered.map((v) => ({
      business: v.business_name,
      owner: v.owner_name,
      role: v.role,
      entity: v.entity,
      trade: v.trade,
      deals_in: v.deals_in,
      email: v.manager_email,
      whatsapp: v.whatsapp,
      plan: v.plan,
      gst: v.gst,
      pan: v.pan,
      verified: v.verified ? "yes" : "no",
      blocked: v.is_blocked ? "yes" : "no",
      status: v.status,
      tags: (v.tags ?? []).join("|"),
      created_at: new Date(v.created_at).toISOString(),
    }));

  const planOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.plan && set.add(r.plan));
    return [
      { value: "", label: "Any status" },
      { value: "active", label: "Active" },
      { value: "blocked", label: "Blocked" },
      { value: "verified", label: "Verified" },
      { value: "unverified", label: "Unverified" },
      ...Array.from(set).map((p) => ({ value: p, label: `Plan: ${p}` })),
    ];
  }, [rows]);

  return (
    <AdminLayout>
      <PageHeader title="Vendors" subtitle={`${rows.length} registered vendors`} />

      <AdminListToolbar
        filters={filters}
        onChange={setFilters}
        onRefresh={load}
        loading={loading}
        statusOptions={planOptions}
        total={rows.length}
        filtered={filtered.length}
        onExportCsv={() => downloadCsv(`vendors-${Date.now()}.csv`, exportRows())}
        onExportPdf={() => downloadPdf("Vendors", exportRows())}
      />

      {loading ? (
        <GoldCard className="p-12 text-center">
          <p className="text-[#f5d97a]/60">Loading vendors…</p>
        </GoldCard>
      ) : filtered.length === 0 ? (
        <GoldCard className="p-12 text-center">
          <Store className="h-12 w-12 text-[#d4af37]/40 mx-auto mb-4" />
          <h3
            className="font-display text-xl font-bold mb-2"
            style={{
              background: "linear-gradient(180deg, #fff8dc, #d4af37)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {rows.length === 0 ? "No vendors yet" : "No matches"}
          </h3>
        </GoldCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(v)}
              className="block w-full text-left"
            >
              <GoldCard className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-[#d4af37]/40 flex-shrink-0 bg-gradient-to-br from-[#fff8dc] to-[#d4af37] grid place-items-center">
                    {v.avatar_url ? (
                      <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-lg font-bold text-[#1a1a1a]">
                        {(v.business_name || v.owner_name || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="font-display text-base font-bold text-[#f5d97a] truncate">
                        {v.business_name || "Unnamed business"}
                      </h3>
                      {v.verified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          <ShieldCheck className="h-2.5 w-2.5" /> VERIFIED
                        </span>
                      )}
                      {v.is_blocked && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                          BLOCKED
                        </span>
                      )}
                      {v.plan && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30 uppercase">
                          {v.plan}
                        </span>
                      )}
                      {(v.tags ?? []).slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-[#f5d97a]/75 mt-0.5">
                      {v.owner_name || "—"} {v.role ? `· ${v.role}` : ""}
                    </p>

                    <div className="mt-1 space-y-0.5 text-xs text-[#f5d97a]/70">
                      {v.manager_email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3" /> {v.manager_email}
                        </div>
                      )}
                      {v.whatsapp && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" /> {v.whatsapp}
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-[#f5d97a]/40 mt-1.5">
                      Joined {new Date(v.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </GoldCard>
            </button>
          ))}
        </div>
      )}

      <AdminRecordDrawer
        open={!!active}
        record={
          active
            ? { ...active, name: active.business_name || active.owner_name, email: active.manager_email, phone: active.whatsapp }
            : null
        }
        entity="vendors"
        entityLabel="Vendor"
        onClose={() => setActive(null)}
        onMutated={load}
        extraFields={
          active
            ? [
                { label: "Owner", value: active.owner_name },
                { label: "Role", value: active.role },
                { label: "Entity", value: active.entity },
                { label: "Trade", value: active.trade },
                { label: "Deals in", value: active.deals_in },
                { label: "Plan", value: active.plan },
                { label: "GST", value: active.gst },
                { label: "PAN", value: active.pan },
                { label: "Aadhaar", value: active.aadhaar },
                { label: "Website", value: active.website },
                { label: "Instagram", value: active.instagram },
                { label: "Facebook", value: active.facebook },
                { label: "Referral", value: active.referral },
              ]
            : []
        }
      />
    </AdminLayout>
  );
}
