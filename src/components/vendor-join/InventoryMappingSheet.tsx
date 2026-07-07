import { useEffect, useMemo, useState } from "react";
import {
  X,
  Wrench,
  ShoppingBag,
  Scissors,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  HelpCircle,
  Headphones,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Type = "product" | "service" | "other";
type Group = { id: string; name: string; type: Type; icon_url?: string | null };
type Item = { id: string; name: string; group_id: string | null; type: Type; icon_url?: string | null };

const TYPE_TABS: { key: Type | "both"; label: string; Icon: any }[] = [
  { key: "service", label: "Services", Icon: Wrench },
  { key: "product", label: "Products", Icon: ShoppingBag },
  { key: "both", label: "Both", Icon: Scissors },
];

export function InventoryMappingSheet({
  selected,
  onChange,
  onSubmit,
  onClose,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  onSubmit: () => void;
  onClose?: () => void;
}) {
  const [type, setType] = useState<Type | "both">("service");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: g }, { data: i }] = await Promise.all([
        supabase.from("catalog_groups").select("id, name, type, icon_url").eq("is_active", true),
        supabase.from("catalog_items").select("id, name, group_id, type, icon_url").eq("is_active", true),
      ]);
      setGroups(((g as any) ?? []) as Group[]);
      setItems(((i as any) ?? []) as Item[]);
      setLoading(false);
    })();
  }, []);

  const filteredGroups = useMemo(
    () => (type === "both" ? groups : groups.filter((g) => g.type === type)),
    [groups, type],
  );

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const isMapped = (groupId: string) => items.some((i) => i.group_id === groupId && selected.includes(i.id));

  const mappedCount = filteredGroups.filter((g) => isMapped(g.id)).length;
  const progress =
    filteredGroups.length > 0
      ? Math.round((mappedCount / filteredGroups.length) * 100)
      : 0;

  return (
    <div className="px-5 pt-3 pb-28 max-w-md mx-auto">
      <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300/70 mb-4" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-2xl font-extrabold text-neutral-900">Category Mapping</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Map your products and services to get more leads
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-full bg-neutral-100 grid place-items-center shrink-0"
        >
          <X className="h-4 w-4 text-neutral-700" />
        </button>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-orange-500">Step 2 of 2</span>
          <span className="text-xs font-bold text-neutral-800">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-orange-100 overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Type tabs */}
      <div className="rounded-2xl bg-orange-50/50 border border-orange-100 p-1 grid grid-cols-3 mb-4">
        {TYPE_TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={`h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              type === key
                ? "bg-white text-orange-500 shadow-sm"
                : "text-neutral-700"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Category chips (horizontal scroll) */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 no-scrollbar mb-2">
        <CatChip
          label="All Categories"
          active={activeCat === "all"}
          onClick={() => setActiveCat("all")}
        />
        {filteredGroups.map((g) => (
          <CatChip
            key={g.id}
            label={g.name}
            active={activeCat === g.id}
            onClick={() => setActiveCat(g.id)}
          />
        ))}
      </div>

      <h4 className="text-base font-extrabold text-neutral-900 mb-2">Main Categories</h4>

      {loading ? (
        <div className="py-12 text-center text-neutral-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-2.5">
          {(activeCat === "all" ? filteredGroups : filteredGroups.filter((g) => g.id === activeCat)).map(
            (g) => {
              const subs = items.filter((i) => i.group_id === g.id);
              const mapped = isMapped(g.id);
              const isOpen = expanded === g.id;
              return (
                <div
                  key={g.id}
                  className={`rounded-2xl border ${
                    isOpen ? "border-orange-200 bg-orange-50/30" : "border-neutral-200 bg-white"
                  }`}
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : g.id)}
                    className="w-full p-3 flex items-center gap-3 text-left"
                  >
                    <div className="h-12 w-12 rounded-xl bg-amber-50 grid place-items-center overflow-hidden shrink-0">
                      {g.icon_url ? (
                        <img src={g.icon_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl">🛠️</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-neutral-900 truncate">{g.name}</div>
                      <div className="text-[11px] text-neutral-500">
                        {subs.length} Sub Categories
                      </div>
                    </div>
                    {mapped ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                        <Check className="h-3 w-3" /> Mapped
                      </span>
                    ) : (
                      <span className="text-orange-500 text-xs font-bold">Map Now</span>
                    )}
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 border-t border-orange-100">
                      <div className="text-xs font-semibold text-neutral-700 mt-3 mb-2">
                        Products & Variations ({g.name})
                      </div>
                      {subs.length === 0 ? (
                        <div className="py-6 text-center text-neutral-400 text-xs">
                          No items yet
                        </div>
                      ) : (
                        <div className="rounded-xl bg-white border border-neutral-100 divide-y divide-neutral-100">
                          {subs.slice(0, 6).map((it) => {
                            const on = selected.includes(it.id);
                            return (
                              <div
                                key={it.id}
                                className="flex items-center gap-3 p-2.5"
                              >
                                <div className="h-10 w-10 rounded-lg bg-neutral-100 grid place-items-center overflow-hidden shrink-0">
                                  {it.icon_url ? (
                                    <img src={it.icon_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-lg">📦</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-neutral-900 truncate">
                                    {it.name}
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggle(it.id)}
                                  className={`relative h-6 w-11 rounded-full transition ${
                                    on ? "bg-emerald-500" : "bg-neutral-300"
                                  }`}
                                  aria-label="Toggle"
                                >
                                  <span
                                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                      on ? "left-[22px]" : "left-0.5"
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {subs.length > 6 && (
                        <button className="w-full mt-2 py-2.5 rounded-xl bg-orange-50 text-orange-600 text-sm font-bold flex items-center justify-center gap-1">
                          <Plus className="h-4 w-4" /> View All Products ({subs.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}

      {/* Help */}
      <div className="mt-5 rounded-2xl border border-neutral-200 bg-white px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-neutral-100 grid place-items-center shrink-0">
          <HelpCircle className="h-4.5 w-4.5 text-neutral-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-neutral-900">Need help?</div>
          <div className="text-[11px] text-neutral-500">Chat with our support team</div>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-100 text-orange-600 text-xs font-bold">
          <Headphones className="h-3.5 w-3.5" /> Chat Now
        </button>
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={onSubmit}
          className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-base shadow-lg"
        >
          Save Mapping ({selected.length}) →
        </button>
      </div>
    </div>
  );
}

function CatChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 min-w-[92px] h-16 px-3 rounded-2xl border-2 text-[11px] font-semibold flex flex-col items-center justify-center gap-1 ${
        active
          ? "border-orange-500 bg-orange-50 text-orange-600"
          : "border-neutral-200 bg-white text-neutral-700"
      }`}
    >
      <div className="h-6 w-6 rounded-md bg-neutral-100 grid place-items-center text-[11px]">
        {label.slice(0, 1)}
      </div>
      <span className="text-center leading-tight line-clamp-2 px-1">{label}</span>
    </button>
  );
}
