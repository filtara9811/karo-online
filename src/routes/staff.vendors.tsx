import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store, Plus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listMyCategories } from "@/lib/staff.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff/vendors")({
  component: StaffVendorsPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CatRow = { id: string; category_id: string; can_onboard: boolean; category?: any };
type Vendor = { id: string; business_name: string | null; phone: string | null; created_at: string };

function StaffVendorsPage() {
  const fetchCats = useServerFn(listMyCategories);
  const [cats, setCats] = useState<CatRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchCats();
        setCats(rows as CatRow[]);
        if (rows.length) setSelected((rows[0] as CatRow).category_id);
      } finally { setLoading(false); }
    })();
  }, [fetchCats]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("vendors").select("id, business_name, phone, created_at").order("created_at", { ascending: false }).limit(50);
      setVendors((data as Vendor[] | null) ?? []);
    })();
  }, [selected]);

  return (
    <div className="max-w-md mx-auto">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[color:oklch(0.9_0.03_85)] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">Vendors</h1>
          <button
            onClick={() => window.location.assign("/vendor/join")}
            className="h-9 px-3 rounded-full bg-gradient-to-r from-[oklch(0.72_0.16_82)] to-[oklch(0.66_0.18_75)] text-white text-xs font-semibold flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Onboard
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          <button onClick={() => setSelected(null)}
            className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium border ${!selected ? "bg-[oklch(0.55_0.16_82)] text-white border-transparent" : "bg-white border-[color:oklch(0.9_0.03_85)]"}`}>
            All
          </button>
          {cats.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.category_id)}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium border ${selected === c.category_id ? "bg-[oklch(0.55_0.16_82)] text-white border-transparent" : "bg-white border-[color:oklch(0.9_0.03_85)]"}`}>
              {c.category?.name ?? "Category"}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : vendors.length === 0 ? (
        <div className="p-10 text-center">
          <Store className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No vendors in this category yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[color:oklch(0.94_0.02_85)]">
          {vendors.map((v) => (
            <li key={v.id} className="px-4 py-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 grid place-items-center text-amber-700 font-bold">
                {(v.business_name ?? "V").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{v.business_name ?? "Unnamed"}</p>
                <p className="text-xs text-muted-foreground">{v.phone ?? "—"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
