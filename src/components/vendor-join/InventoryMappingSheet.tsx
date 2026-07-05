import { useEffect, useMemo, useState } from "react";
import { Search, Check, Package, Wrench, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Type = "product" | "service" | "other";

type Group = { id: string; name: string; type: Type };
type Item = { id: string; name: string; group_id: string | null; type: Type; icon_url?: string | null };

export function InventoryMappingSheet({
  selected,
  onChange,
  onSubmit,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  onSubmit: () => void;
}) {
  const [type, setType] = useState<Type>("service");
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: g }, { data: i }] = await Promise.all([
        supabase.from("catalog_groups").select("id, name, type").eq("is_active", true),
        supabase.from("catalog_items").select("id, name, group_id, type, icon_url").eq("is_active", true),
      ]);
      setGroups(((g as any) ?? []) as Group[]);
      setItems(((i as any) ?? []) as Item[]);
      setLoading(false);
    })();
  }, []);

  const filteredGroups = useMemo(
    () => groups.filter((g) => g.type === type),
    [groups, type],
  );

  const filteredItems = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((it) => {
      if (it.type !== type) return false;
      if (activeGroup !== "all" && it.group_id !== activeGroup) return false;
      if (term && !it.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [items, type, activeGroup, q]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="pb-32 px-4 pt-2 max-w-md mx-auto">
      <header className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900">Inventory Mapping</h2>
          <p className="text-sm text-neutral-500">Apni services / products select karein</p>
        </div>
        <span className="px-3 py-1 rounded-full border border-amber-400 text-amber-700 text-xs font-semibold">
          Step 2 of 3
        </span>
      </header>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search services, categories..."
          className="w-full pl-10 pr-3 py-3 rounded-2xl border border-neutral-200 bg-white text-sm outline-none focus:border-amber-400"
        />
      </div>

      {/* Type tabs */}
      <div className="mb-3">
        <p className="text-xs font-bold text-neutral-800 mb-2">Select Type</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: "product" as const, label: "Products", Icon: Package },
              { key: "service" as const, label: "Service", Icon: Wrench },
              { key: "other" as const, label: "Other", Icon: LayoutGrid },
            ]
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => {
                setType(key);
                setActiveGroup("all");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold ${
                type === key
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "bg-white border-neutral-200 text-neutral-800"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <p className="text-xs font-bold text-neutral-800 mb-2">Main Categories</p>
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
        <button
          onClick={() => setActiveGroup("all")}
          className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold ${
            activeGroup === "all"
              ? "border-orange-500 text-orange-600 bg-orange-50"
              : "border-neutral-200 text-neutral-700 bg-white"
          }`}
        >
          All Categories
        </button>
        {filteredGroups.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGroup(g.id)}
            className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold ${
              activeGroup === g.id
                ? "border-orange-500 text-orange-600 bg-orange-50"
                : "border-neutral-200 text-neutral-700 bg-white"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="py-12 text-center text-neutral-400">Loading…</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center text-neutral-400 text-sm">
          Koi item nahi mila. Search change karein.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((it) => {
            const on = selected.includes(it.id);
            return (
              <button
                key={it.id}
                onClick={() => toggle(it.id)}
                className={`relative rounded-2xl border-2 p-3 text-left transition-all ${
                  on
                    ? "border-orange-500 bg-orange-50 shadow-md"
                    : "border-neutral-200 bg-white"
                }`}
              >
                {on && (
                  <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-orange-500 text-white grid place-items-center">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
                {it.icon_url ? (
                  <img
                    src={it.icon_url}
                    alt=""
                    className="h-14 w-14 object-contain mb-2"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-amber-100 mb-2 grid place-items-center text-2xl">
                    🛠️
                  </div>
                )}
                <div className="text-sm font-bold text-neutral-900 leading-tight">
                  {it.name}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={onSubmit}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-base shadow-lg"
        >
          Continue ({selected.length} selected) →
        </button>
      </div>
    </div>
  );
}
