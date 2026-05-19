import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { Users, Mail, Phone, MapPin, ShieldCheck } from "lucide-react";
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

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomersPage,
});

type Customer = AdminRecord & {
  gender: string | null;
  address: string | null;
  signup_method: string | null;
  support_code: string | null;
};

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ListFilters>(emptyFilters);
  const [active, setActive] = useState<Customer | null>(null);
  const navigate = useNavigate();


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Customers load fail");
    else setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      applyFilters(customers, filters, (c) => [
        c.name ?? "",
        c.email ?? "",
        c.phone ?? "",
        c.address ?? "",
        c.support_code ?? "",
        ...(c.tags ?? []),
      ]),
    [customers, filters],
  );

  const exportRows = () =>
    filtered.map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      gender: c.gender,
      address: c.address,
      signup: c.signup_method,
      verified: c.verified ? "yes" : "no",
      blocked: c.is_blocked ? "yes" : "no",
      status: c.status,
      tags: (c.tags ?? []).join("|"),
      created_at: new Date(c.created_at).toISOString(),
    }));

  return (
    <AdminLayout>
      <PageHeader title="Customers" subtitle={`${customers.length} registered users`} />

      <AdminListToolbar
        filters={filters}
        onChange={setFilters}
        onRefresh={load}
        loading={loading}
        total={customers.length}
        filtered={filtered.length}
        onExportCsv={() => downloadCsv(`customers-${Date.now()}.csv`, exportRows())}
        onExportPdf={() => downloadPdf("Customers", exportRows())}
      />

      {loading ? (
        <GoldCard className="p-12 text-center">
          <p className="text-[#f5d97a]/60">Loading customers…</p>
        </GoldCard>
      ) : filtered.length === 0 ? (
        <GoldCard className="p-12 text-center">
          <Users className="h-12 w-12 text-[#d4af37]/40 mx-auto mb-4" />
          <h3
            className="font-display text-xl font-bold mb-2"
            style={{
              background: "linear-gradient(180deg, #fff8dc, #d4af37)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {customers.length === 0 ? "No customers yet" : "No matches"}
          </h3>
        </GoldCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c)}
              className="block w-full text-left"
            >
              <GoldCard className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-[#d4af37]/40 flex-shrink-0 bg-gradient-to-br from-[#fff8dc] to-[#d4af37] grid place-items-center">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-lg font-bold text-[#1a1a1a]">
                      {(c.name || c.email || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-display text-base font-bold text-[#f5d97a] truncate">
                      {c.name || "Unnamed customer"}
                    </h3>
                    {c.support_code && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 font-mono">
                        #{c.support_code}
                      </span>
                    )}
                    {c.verified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        <ShieldCheck className="h-2.5 w-2.5" /> VERIFIED
                      </span>
                    )}
                    {c.is_blocked && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                        BLOCKED
                      </span>
                    )}
                    {(c.tags ?? []).slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-1 space-y-0.5 text-xs text-[#f5d97a]/75">
                    {c.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {c.email}
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{c.address}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-[#f5d97a]/40 mt-1.5">
                    Joined {new Date(c.created_at).toLocaleString()}
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
        record={active}
        entity="customers"
        entityLabel="Customer"
        onClose={() => setActive(null)}
        onMutated={load}
        extraFields={
          active
            ? [
                { label: "Gender", value: active.gender },
                { label: "Address", value: active.address },
                { label: "Signup via", value: active.signup_method },
              ]
            : []
        }
      />
    </AdminLayout>
  );
}
