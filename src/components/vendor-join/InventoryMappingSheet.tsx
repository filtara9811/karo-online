import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wrench,
  ShoppingBag,
  Scissors,
  ChevronDown,
  Check,
  HelpCircle,
  Headphones,
  Search,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ItemMapping = {
  variations: string[];
  price_min: number | null;
  price_max: number | null;
  notes: string;
};

type TypeCode = "service" | "product" | "both";

type CatType = { id: string; code: string; name: string };
type Category = {
  id: string;
  name: string;
  type_id: string | null;
  image_url: string | null;
  icon: string | null;
};
type Item = {
  id: string;
  name: string;
  category_id: string;
  image_url: string | null;
  icon: string | null;
  price_min: number | null;
  price_max: number | null;
};
type Variation = {
  id: string;
  item_id: string;
  name: string;
  image_url: string | null;
  group_tag: string | null;
  price_min: number | null;
  price_max: number | null;
};

const TYPE_TABS: { key: TypeCode; label: string; Icon: any }[] = [
  { key: "service", label: "Services", Icon: Wrench },
  { key: "product", label: "Products", Icon: ShoppingBag },
  { key: "both", label: "Both", Icon: Scissors },
];

export function InventoryMappingSheet({
  mappings,
  onChange,
  onSubmit,
  onClose,
}: {
  mappings: Record<string, ItemMapping>;
  onChange: (m: Record<string, ItemMapping>) => void;
  onSubmit: () => void;
  onClose?: () => void;
}) {
  const [type, setType] = useState<TypeCode>("service");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [types, setTypes] = useState<CatType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [t, c, i, v] = await Promise.all([
        supabase.from("catalog_types").select("id, code, name").eq("is_active", true),
        supabase
          .from("categories")
          .select("id, name, type_id, image_url, icon")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("catalog_items")
          .select("id, name, category_id, image_url, icon, price_min, price_max")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("item_variations")
          .select("id, item_id, name, image_url, group_tag, price_min, price_max")
          .eq("is_active", true)
          .order("sort_order"),
      ]);
      setTypes((t.data as any) ?? []);
      setCategories((c.data as any) ?? []);
      setItems((i.data as any) ?? []);
      setVariations((v.data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const typeIdByCode = useMemo(() => {
    const map: Record<string, string> = {};
    types.forEach((t) => (map[t.code] = t.id));
    return map;
  }, [types]);

  const filteredCats = useMemo(() => {
    if (type === "both") return categories;
    const tid = typeIdByCode[type];
    return tid ? categories.filter((c) => c.type_id === tid) : categories;
  }, [categories, type, typeIdByCode]);

  const visibleItems = useMemo(() => {
    const catIds = new Set(filteredCats.map((c) => c.id));
    let out = items.filter((it) => catIds.has(it.category_id));
    if (activeCat !== "all") out = out.filter((it) => it.category_id === activeCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((it) => it.name.toLowerCase().includes(q));
    }
    return out;
  }, [items, filteredCats, activeCat, search]);

  const mappedCount = Object.keys(mappings).filter((k) =>
    visibleItems.some((it) => it.id === k),
  ).length;
  const progress =
    visibleItems.length > 0 ? Math.round((mappedCount / visibleItems.length) * 100) : 0;

  const totalVariationsMapped = Object.values(mappings).reduce(
    (n, m) => n + (m.variations?.length || 0),
    0,
  );

  const updateMapping = (itemId: string, patch: Partial<ItemMapping>) => {
    const cur = mappings[itemId] ?? { variations: [], price_min: null, price_max: null, notes: "" };
    onChange({ ...mappings, [itemId]: { ...cur, ...patch } });
  };
  const removeMapping = (itemId: string) => {
    const { [itemId]: _, ...rest } = mappings;
    onChange(rest);
  };
  const isMapped = (itemId: string) => Boolean(mappings[itemId]?.variations?.length);

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
          className="h-8 w-8 rounded-full bg-neutral-100 grid place-items-center shrink-0 transition hover:bg-neutral-200"
        >
          <X className="h-4 w-4 text-neutral-700" />
        </button>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-orange-500">Step 2 of 2</span>
          <span className="text-xs font-bold text-neutral-800">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-orange-100 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Type tabs */}
      <div className="rounded-2xl bg-orange-50/60 border border-orange-100 p-1 grid grid-cols-3 mb-3">
        {TYPE_TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => {
              setType(key);
              setActiveCat("all");
              setExpanded(null);
            }}
            className={`h-9 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
              type === key
                ? "bg-white text-orange-500 shadow-sm"
                : "text-neutral-700 active:scale-95"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-3 rounded-xl border border-neutral-200 bg-white h-10 flex items-center px-3 gap-2">
        <Search className="h-4 w-4 text-neutral-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories / products"
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-neutral-400"
        />
      </div>

      {/* Category chips (horizontal scroll) */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 no-scrollbar mb-1">
        <CatChip
          label="All Categories"
          initial="A"
          image={null}
          active={activeCat === "all"}
          onClick={() => setActiveCat("all")}
        />
        {filteredCats.map((c) => (
          <CatChip
            key={c.id}
            label={c.name}
            initial={c.name.slice(0, 1)}
            image={c.image_url || c.icon}
            active={activeCat === c.id}
            onClick={() => setActiveCat(c.id)}
          />
        ))}
      </div>

      <h4 className="text-base font-extrabold text-neutral-900 mb-2">Main Categories</h4>

      {loading ? (
        <div className="py-12 text-center text-neutral-400 text-sm">Loading catalog…</div>
      ) : visibleItems.length === 0 ? (
        <div className="py-10 text-center text-neutral-400 text-sm">No items found</div>
      ) : (
        <div className="space-y-2.5">
          {visibleItems.map((it) => {
            const subs = variations.filter((v) => v.item_id === it.id);
            const groups = Array.from(
              new Set(subs.map((s) => s.group_tag).filter(Boolean) as string[]),
            );
            const activeSub = subTab[it.id] ?? "all";
            const filteredSubs =
              activeSub === "all" ? subs : subs.filter((s) => s.group_tag === activeSub);
            const mapping = mappings[it.id];
            const mapped = isMapped(it.id);
            const isOpen = expanded === it.id;

            return (
              <motion.div
                key={it.id}
                layout
                className={`rounded-2xl border transition-colors ${
                  isOpen ? "border-orange-200 bg-orange-50/40" : "border-neutral-200 bg-white"
                }`}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : it.id)}
                  className="w-full p-3 flex items-center gap-3 text-left"
                >
                  <div className="h-12 w-12 rounded-xl bg-amber-50 grid place-items-center overflow-hidden shrink-0">
                    {it.image_url ? (
                      <img src={it.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl">{it.icon || "🛠️"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-neutral-900 truncate">{it.name}</div>
                    <div className="text-[11px] text-neutral-500">
                      {groups.length > 0 && `${groups.length} Sub Categories • `}
                      {subs.length} Variations
                    </div>
                  </div>
                  {mapped ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                      <Check className="h-3 w-3" /> Mapped
                    </span>
                  ) : (
                    <span className="text-orange-500 text-xs font-bold">Map Now</span>
                  )}
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 border-t border-orange-100">
                        {/* Sub-category tabs */}
                        {groups.length > 0 && (
                          <>
                            <div className="text-xs font-semibold text-neutral-700 mt-3 mb-2">
                              Select Variation (Sub Category)
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                              <SubChip
                                label="All"
                                sub={`(${subs.length})`}
                                active={activeSub === "all"}
                                onClick={() => setSubTab({ ...subTab, [it.id]: "all" })}
                              />
                              {groups.map((g) => (
                                <SubChip
                                  key={g}
                                  label={g}
                                  sub={`${subs.filter((s) => s.group_tag === g).length} Products`}
                                  active={activeSub === g}
                                  onClick={() => setSubTab({ ...subTab, [it.id]: g })}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        <div className="text-xs font-semibold text-neutral-700 mt-3 mb-2">
                          Products & Variations {activeSub !== "all" && `(${activeSub})`}
                        </div>

                        {filteredSubs.length === 0 ? (
                          <div className="py-6 text-center text-neutral-400 text-xs">
                            No variations available
                          </div>
                        ) : (
                          <div className="rounded-xl bg-white border border-neutral-100 divide-y divide-neutral-100">
                            {filteredSubs.map((v) => {
                              const on = mapping?.variations?.includes(v.id) ?? false;
                              return (
                                <div key={v.id} className="flex items-center gap-3 p-2.5">
                                  <div className="h-10 w-10 rounded-lg bg-neutral-100 grid place-items-center overflow-hidden shrink-0">
                                    {v.image_url ? (
                                      <img
                                        src={v.image_url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-lg">📦</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-neutral-900 truncate">
                                      {v.name}
                                    </div>
                                    <div className="flex gap-3 text-[10px] text-neutral-500 mt-0.5">
                                      {v.price_min != null && (
                                        <span>
                                          Basic{" "}
                                          <span className="text-neutral-800 font-bold">
                                            ₹{v.price_min}
                                          </span>
                                        </span>
                                      )}
                                      {v.price_max != null && (
                                        <span>
                                          Premium{" "}
                                          <span className="text-neutral-800 font-bold">
                                            ₹{v.price_max}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const cur = mapping?.variations ?? [];
                                      const next = on
                                        ? cur.filter((x) => x !== v.id)
                                        : [...cur, v.id];
                                      if (next.length === 0) removeMapping(it.id);
                                      else updateMapping(it.id, { variations: next });
                                    }}
                                    className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                                      on ? "bg-emerald-500" : "bg-neutral-300"
                                    }`}
                                    aria-label="Toggle"
                                  >
                                    <motion.span
                                      className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                                      animate={{ left: on ? 22 : 2 }}
                                      transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 30,
                                      }}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Pricing editor */}
                        {mapped && (
                          <button
                            type="button"
                            onClick={() => setEditing(editing === it.id ? null : it.id)}
                            className="w-full mt-3 py-2 rounded-xl bg-orange-50 text-orange-600 text-xs font-bold flex items-center justify-center gap-1.5"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {editing === it.id ? "Close pricing" : "Set your prices & notes"}
                          </button>
                        )}
                        <AnimatePresence initial={false}>
                          {editing === it.id && mapped && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 rounded-xl bg-white border border-neutral-200 p-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <PriceInput
                                    label="Basic Price"
                                    value={mapping?.price_min ?? null}
                                    onChange={(n) => updateMapping(it.id, { price_min: n })}
                                  />
                                  <PriceInput
                                    label="Premium Price"
                                    value={mapping?.price_max ?? null}
                                    onChange={(n) => updateMapping(it.id, { price_max: n })}
                                  />
                                </div>
                                <div>
                                  <div className="text-[11px] font-semibold text-neutral-700 mb-1">
                                    Short note (optional)
                                  </div>
                                  <textarea
                                    value={mapping?.notes ?? ""}
                                    onChange={(e) =>
                                      updateMapping(it.id, { notes: e.target.value })
                                    }
                                    rows={2}
                                    placeholder="e.g. Free pickup, express delivery in 24 hrs"
                                    className="w-full text-sm rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 outline-none focus:border-orange-400 resize-none"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Help */}
      <div className="mt-5 rounded-2xl border border-neutral-200 bg-white px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-neutral-100 grid place-items-center shrink-0">
          <HelpCircle className="h-4 w-4 text-neutral-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-neutral-900">Need help?</div>
          <div className="text-[11px] text-neutral-500">Chat with our support team</div>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-100 text-orange-600 text-xs font-bold">
          <Headphones className="h-3.5 w-3.5" /> Chat Now
        </button>
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white to-transparent">
        <button
          type="button"
          disabled={totalVariationsMapped === 0}
          onClick={onSubmit}
          className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[.99] disabled:opacity-40 text-white font-bold text-[15px] shadow-md transition-all duration-200"
        >
          Save Mapping ({totalVariationsMapped}) →
        </button>
      </div>
    </div>
  );
}

function CatChip({
  label,
  initial,
  image,
  active,
  onClick,
}: {
  label: string;
  initial: string;
  image: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 min-w-[78px] h-14 px-2.5 rounded-2xl border-2 text-[10.5px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
        active
          ? "border-orange-500 bg-orange-50 text-orange-600"
          : "border-neutral-200 bg-white text-neutral-700"
      }`}
    >
      <div className="h-5 w-5 rounded-md bg-neutral-100 grid place-items-center overflow-hidden text-[10px]">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      <span className="text-center leading-tight line-clamp-2 px-1">{label}</span>
    </button>
  );
}

function SubChip({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-xl border-2 text-xs font-bold text-center leading-tight transition-all duration-200 ${
        active
          ? "border-orange-500 bg-orange-50 text-orange-600"
          : "border-neutral-200 bg-white text-neutral-700"
      }`}
    >
      <div>{label}</div>
      <div className="text-[10px] font-medium opacity-80">{sub}</div>
    </button>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-neutral-700 mb-1">{label}</div>
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 h-9 flex items-center px-3 gap-1">
        <span className="text-sm text-neutral-500">₹</span>
        <input
          value={value ?? ""}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            onChange(v ? Number(v) : null);
          }}
          inputMode="numeric"
          placeholder="0"
          className="flex-1 text-sm bg-transparent outline-none"
        />
      </div>
    </div>
  );
}
