import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wrench,
  ShoppingBag,
  Layers,
  ChevronDown,
  ChevronRight,
  Check,
  HelpCircle,
  Headphones,
  Search,
  Pencil,
  ArrowLeft,
  Clock,
  Home,
  Store as StoreIcon,
  Zap,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ItemMapping = {
  variations: string[];
  price_min: number | null;
  price_max: number | null;
  notes: string;
  /** UI-only: per-product overrides (basic/premium) keyed by variation id */
  variation_prices?: Record<string, { basic?: number | null; premium?: number | null }>;
  /** UI-only: advanced settings keyed by variation id */
  advanced?: Record<string, AdvancedProduct>;
};

export type AdvancedProduct = {
  profile?: "personal" | "business";
  cover_url?: string | null;
  gallery_urls?: string[];
  video_url?: string | null;
  description?: string;
  offer_price?: number | null;
  estimated_time?: string;
  home_service?: boolean;
  shop_visit?: boolean;
  emergency?: boolean;
  active?: boolean;
};

type TypeCode = "service" | "product" | "both";

type CatType = { id: string; code: string; name: string };
type Category = { id: string; name: string; type_id: string | null; image_url: string | null; icon: string | null };
type Item = { id: string; name: string; category_id: string; image_url: string | null; icon: string | null; price_min: number | null; price_max: number | null };
type Variation = { id: string; item_id: string; name: string; image_url: string | null; group_tag: string | null; price_min: number | null; price_max: number | null };

const TYPE_TABS: { key: TypeCode; label: string; Icon: any; hint: string }[] = [
  { key: "service", label: "Services", Icon: Wrench, hint: "Only services" },
  { key: "product", label: "Products", Icon: ShoppingBag, hint: "Only products" },
  { key: "both", label: "Both", Icon: Layers, hint: "Products + services" },
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
  const [type, setType] = useState<TypeCode | null>(null);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [quickEdit, setQuickEdit] = useState<{ itemId: string; varId: string } | null>(null);
  const [advanced, setAdvanced] = useState<{ itemId: string; varId: string } | null>(null);

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
        supabase.from("categories").select("id, name, type_id, image_url, icon").eq("is_active", true).order("sort_order"),
        supabase.from("catalog_items").select("id, name, category_id, image_url, icon, price_min, price_max").eq("is_active", true).order("sort_order"),
        supabase.from("item_variations").select("id, item_id, name, image_url, group_tag, price_min, price_max").eq("is_active", true).order("sort_order"),
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
    if (!type) return [];
    if (type === "both") return categories;
    const tid = typeIdByCode[type];
    return tid ? categories.filter((c) => c.type_id === tid) : categories;
  }, [categories, type, typeIdByCode]);

  const visibleItems = useMemo(() => {
    if (!type) return [];
    const catIds = new Set(filteredCats.map((c) => c.id));
    let out = items.filter((it) => catIds.has(it.category_id));
    if (activeCat !== "all") out = out.filter((it) => it.category_id === activeCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((it) => it.name.toLowerCase().includes(q));
    }
    return out;
  }, [items, filteredCats, activeCat, search, type]);

  const totalVariationsMapped = Object.values(mappings).reduce((n, m) => n + (m.variations?.length || 0), 0);
  const mappedItems = visibleItems.filter((it) => (mappings[it.id]?.variations?.length ?? 0) > 0).length;
  const progress = visibleItems.length > 0 ? Math.round((mappedItems / visibleItems.length) * 100) : 0;

  const updateMapping = (itemId: string, patch: Partial<ItemMapping>) => {
    const cur = mappings[itemId] ?? { variations: [], price_min: null, price_max: null, notes: "" };
    onChange({ ...mappings, [itemId]: { ...cur, ...patch } });
  };
  const removeMapping = (itemId: string) => {
    const { [itemId]: _, ...rest } = mappings;
    onChange(rest);
  };
  const setVarPrice = (itemId: string, varId: string, patch: { basic?: number | null; premium?: number | null }) => {
    const cur = mappings[itemId] ?? { variations: [], price_min: null, price_max: null, notes: "" };
    const vp = { ...(cur.variation_prices ?? {}) };
    vp[varId] = { ...(vp[varId] ?? {}), ...patch };
    onChange({ ...mappings, [itemId]: { ...cur, variation_prices: vp } });
  };
  const setAdvancedField = (itemId: string, varId: string, patch: Partial<AdvancedProduct>) => {
    const cur = mappings[itemId] ?? { variations: [], price_min: null, price_max: null, notes: "" };
    const adv = { ...(cur.advanced ?? {}) };
    adv[varId] = { ...(adv[varId] ?? {}), ...patch };
    onChange({ ...mappings, [itemId]: { ...cur, advanced: adv } });
  };

  const toggleProduct = (itemId: string, varId: string) => {
    const cur = mappings[itemId]?.variations ?? [];
    const on = cur.includes(varId);
    const next = on ? cur.filter((x) => x !== varId) : [...cur, varId];
    if (next.length === 0) removeMapping(itemId);
    else updateMapping(itemId, { variations: next });
  };

  const isMapped = (itemId: string) => Boolean(mappings[itemId]?.variations?.length);

  // ---- Advanced sheet ----
  if (advanced) {
    const item = items.find((i) => i.id === advanced.itemId);
    const v = variations.find((x) => x.id === advanced.varId);
    const mapping = mappings[advanced.itemId];
    const adv = mapping?.advanced?.[advanced.varId] ?? {};
    const priceOv = mapping?.variation_prices?.[advanced.varId] ?? {};
    const active = mapping?.variations?.includes(advanced.varId) ?? false;
    if (!item || !v) {
      setAdvanced(null);
      return null;
    }
    return (
      <AdvancedSheet
        productName={v.name}
        productImage={v.image_url || item.image_url}
        active={active}
        onToggleActive={() => toggleProduct(advanced.itemId, advanced.varId)}
        adv={adv}
        priceOv={priceOv}
        defaultBasic={v.price_min}
        defaultPremium={v.price_max}
        onPatch={(p) => setAdvancedField(advanced.itemId, advanced.varId, p)}
        onPatchPrice={(p) => setVarPrice(advanced.itemId, advanced.varId, p)}
        onBack={() => setAdvanced(null)}
      />
    );
  }

  return (
    <div className="px-5 pt-3 pb-28 max-w-md mx-auto">
      <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300/70 mb-4" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold text-neutral-900 leading-tight">Category Mapping</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Map your products & services to get more leads
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full bg-neutral-100 grid place-items-center shrink-0 hover:bg-neutral-200"
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
          <motion.div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* STEP 1 — Type */}
      <SectionLabel n={1} label="Choose Type" />
      <div className="grid grid-cols-3 gap-2 mb-5">
        {TYPE_TABS.map(({ key, label, Icon, hint }) => {
          const active = type === key;
          return (
            <button
              key={key}
              onClick={() => {
                setType(key);
                setActiveCat("all");
                setExpanded(null);
              }}
              className={`rounded-2xl border-2 p-3 flex flex-col items-center gap-1 transition-all duration-200 ${
                active
                  ? "border-orange-500 bg-orange-50"
                  : "border-neutral-200 bg-white active:scale-95"
              }`}
            >
              <div className={`h-9 w-9 rounded-xl grid place-items-center ${active ? "bg-orange-500 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className={`text-[13px] font-bold ${active ? "text-orange-600" : "text-neutral-900"}`}>{label}</div>
              <div className="text-[10px] text-neutral-500 text-center leading-tight">{hint}</div>
            </button>
          );
        })}
      </div>

      {!type ? (
        <div className="rounded-2xl bg-orange-50/60 border border-dashed border-orange-200 py-10 text-center">
          <div className="text-3xl mb-2">👆</div>
          <div className="text-sm font-bold text-neutral-800">Select what you sell to begin</div>
          <div className="text-xs text-neutral-500 mt-1">Choose Services, Products, or Both</div>
        </div>
      ) : (
        <>
          {/* STEP 2 — Main Categories */}
          <SectionLabel n={2} label="Main Categories" />

          <div className="mb-3 rounded-xl border border-neutral-200 bg-white h-10 flex items-center px-3 gap-2">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories or products"
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-neutral-400"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 no-scrollbar mb-4">
            <MainCatCard
              label="All"
              image={null}
              icon="🗂️"
              active={activeCat === "all"}
              onClick={() => setActiveCat("all")}
            />
            {filteredCats.map((c) => (
              <MainCatCard
                key={c.id}
                label={c.name}
                image={c.image_url}
                icon={c.icon || "📦"}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
              />
            ))}
          </div>

          {/* STEP 3 — Sub Categories */}
          <SectionLabel n={3} label="Sub Categories" />

          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-sm">Loading catalog…</div>
          ) : visibleItems.length === 0 ? (
            <div className="py-10 text-center text-neutral-400 text-sm">
              No sub-categories in this selection
            </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((it) => {
                const subs = variations.filter((v) => v.item_id === it.id);
                const groups = Array.from(new Set(subs.map((s) => s.group_tag).filter(Boolean) as string[]));
                const activeSub = subTab[it.id] ?? (groups[0] ?? "all");
                const filteredSubs = activeSub === "all" ? subs : subs.filter((s) => s.group_tag === activeSub);
                const mapping = mappings[it.id];
                const mapped = isMapped(it.id);
                const isOpen = expanded === it.id;
                const mappedInItem = mapping?.variations?.length ?? 0;

                return (
                  <motion.div
                    key={it.id}
                    layout
                    className={`rounded-2xl border transition-colors overflow-hidden ${
                      isOpen ? "border-orange-300 bg-orange-50/40 shadow-sm" : "border-neutral-200 bg-white"
                    }`}
                  >
                    {/* Sub-category header */}
                    <button
                      onClick={() => setExpanded(isOpen ? null : it.id)}
                      className="w-full p-3.5 flex items-center gap-3 text-left"
                    >
                      <div className="h-14 w-14 rounded-2xl bg-amber-50 grid place-items-center overflow-hidden shrink-0">
                        {it.image_url ? (
                          <img src={it.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl">{it.icon || "🛠️"}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-extrabold text-neutral-900 truncate">{it.name}</div>
                        <div className="flex flex-wrap gap-x-2 text-[11px] text-neutral-500 mt-0.5">
                          {groups.length > 0 && <span>{groups.length} Child</span>}
                          <span>{subs.length} Products</span>
                          {mappedInItem > 0 && (
                            <span className="text-emerald-600 font-bold">• {mappedInItem} Active</span>
                          )}
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
                        <ChevronDown className="h-4 w-4 text-neutral-400 ml-1" />
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
                          <div className="px-3 pb-3.5 border-t border-orange-100">
                            {/* STEP 4 — Child (variation) chips */}
                            {groups.length > 0 && (
                              <>
                                <div className="text-[11px] font-bold text-neutral-700 mt-3 mb-2 uppercase tracking-wide">
                                  Select Variation
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                  <ChildChip
                                    label="All"
                                    sub={`${subs.length}`}
                                    active={activeSub === "all"}
                                    onClick={() => setSubTab({ ...subTab, [it.id]: "all" })}
                                  />
                                  {groups.map((g) => (
                                    <ChildChip
                                      key={g}
                                      label={g}
                                      sub={`${subs.filter((s) => s.group_tag === g).length}`}
                                      active={activeSub === g}
                                      onClick={() => setSubTab({ ...subTab, [it.id]: g })}
                                    />
                                  ))}
                                </div>
                              </>
                            )}

                            {/* STEP 5 — Product list */}
                            <div className="text-[11px] font-bold text-neutral-700 mt-3 mb-2 uppercase tracking-wide">
                              Products {activeSub !== "all" && `• ${activeSub}`}
                            </div>

                            {filteredSubs.length === 0 ? (
                              <div className="py-6 text-center text-neutral-400 text-xs">
                                No products in this variation
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {filteredSubs.map((v) => {
                                  const on = mapping?.variations?.includes(v.id) ?? false;
                                  const ov = mapping?.variation_prices?.[v.id] ?? {};
                                  const basic = ov.basic ?? v.price_min;
                                  const premium = ov.premium ?? v.price_max;
                                  const editing = quickEdit?.itemId === it.id && quickEdit?.varId === v.id;
                                  return (
                                    <motion.div
                                      key={v.id}
                                      layout
                                      className={`rounded-2xl border-2 bg-white transition-colors ${
                                        on ? "border-emerald-200" : "border-neutral-200"
                                      }`}
                                    >
                                      <div className="p-2.5 flex items-center gap-2.5">
                                        <div className="h-14 w-14 rounded-xl bg-neutral-100 grid place-items-center overflow-hidden shrink-0">
                                          {v.image_url ? (
                                            <img src={v.image_url} alt="" className="h-full w-full object-cover" />
                                          ) : (
                                            <span className="text-xl">📦</span>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-[13.5px] font-bold text-neutral-900 truncate">
                                            {v.name}
                                          </div>
                                          <div className="text-[10.5px] text-neutral-500 truncate mt-0.5">
                                            {v.group_tag || "Standard variation"}
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-neutral-500">Basic</span>
                                            <span className="text-[12px] font-extrabold text-neutral-900">
                                              ₹{basic ?? "—"}
                                            </span>
                                            <span className="text-[10px] text-neutral-500 ml-1">Premium</span>
                                            <span className="text-[12px] font-extrabold text-orange-600">
                                              ₹{premium ?? "—"}
                                            </span>
                                            <button
                                              onClick={() =>
                                                setQuickEdit(editing ? null : { itemId: it.id, varId: v.id })
                                              }
                                              className="h-6 w-6 rounded-md bg-neutral-100 grid place-items-center hover:bg-neutral-200"
                                              aria-label="Quick edit"
                                            >
                                              <Pencil className="h-3 w-3 text-neutral-600" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                                          <ToggleSwitch on={on} onClick={() => toggleProduct(it.id, v.id)} />
                                          <button
                                            onClick={() => setAdvanced({ itemId: it.id, varId: v.id })}
                                            className="h-6 w-6 rounded-md hover:bg-neutral-100 grid place-items-center"
                                            aria-label="Advanced"
                                          >
                                            <ChevronRight className="h-4 w-4 text-neutral-400" />
                                          </button>
                                        </div>
                                      </div>

                                      <AnimatePresence initial={false}>
                                        {editing && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.18 }}
                                            className="overflow-hidden border-t border-neutral-100"
                                          >
                                            <div className="p-2.5 grid grid-cols-2 gap-2">
                                              <PriceInput
                                                label="Basic Price"
                                                value={basic}
                                                onChange={(n) =>
                                                  setVarPrice(it.id, v.id, { basic: n })
                                                }
                                              />
                                              <PriceInput
                                                label="Premium Price"
                                                value={premium}
                                                onChange={(n) =>
                                                  setVarPrice(it.id, v.id, { premium: n })
                                                }
                                              />
                                              <button
                                                onClick={() => setQuickEdit(null)}
                                                className="col-span-2 h-9 rounded-xl bg-orange-500 text-white text-xs font-bold"
                                              >
                                                Save
                                              </button>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            )}
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
        </>
      )}

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

/* ============= Sub-components ============= */

function SectionLabel({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="h-6 w-6 rounded-full bg-orange-500 text-white text-[11px] font-black grid place-items-center">
        {n}
      </div>
      <h4 className="text-[15px] font-extrabold text-neutral-900">{label}</h4>
    </div>
  );
}

function MainCatCard({
  label,
  image,
  icon,
  active,
  onClick,
}: {
  label: string;
  image: string | null;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 w-[88px] rounded-2xl border-2 p-2 flex flex-col items-center gap-1.5 transition-all duration-200 ${
        active
          ? "border-orange-500 bg-orange-50"
          : "border-neutral-200 bg-white active:scale-95"
      }`}
    >
      <div className={`h-11 w-11 rounded-xl grid place-items-center overflow-hidden ${active ? "bg-white" : "bg-neutral-50"}`}>
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xl">{icon}</span>
        )}
      </div>
      <span className={`text-[10.5px] font-bold text-center leading-tight line-clamp-2 ${active ? "text-orange-600" : "text-neutral-800"}`}>
        {label}
      </span>
    </button>
  );
}

function ChildChip({
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
      className={`shrink-0 px-3 py-2 rounded-xl border-2 text-xs font-bold flex items-center gap-1.5 transition-all duration-200 ${
        active
          ? "border-orange-500 bg-orange-50 text-orange-600"
          : "border-neutral-200 bg-white text-neutral-700"
      }`}
    >
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${active ? "bg-orange-500 text-white" : "bg-neutral-100 text-neutral-600"}`}>
        {sub}
      </span>
    </button>
  );
}

function ToggleSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
        on ? "bg-emerald-500" : "bg-neutral-300"
      }`}
      aria-label="Toggle product"
    >
      <motion.span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
        animate={{ left: on ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
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

/* ============= Advanced Settings ============= */

function AdvancedSheet({
  productName,
  productImage,
  active,
  onToggleActive,
  adv,
  priceOv,
  defaultBasic,
  defaultPremium,
  onPatch,
  onPatchPrice,
  onBack,
}: {
  productName: string;
  productImage: string | null;
  active: boolean;
  onToggleActive: () => void;
  adv: AdvancedProduct;
  priceOv: { basic?: number | null; premium?: number | null };
  defaultBasic: number | null;
  defaultPremium: number | null;
  onPatch: (p: Partial<AdvancedProduct>) => void;
  onPatchPrice: (p: { basic?: number | null; premium?: number | null }) => void;
  onBack: () => void;
}) {
  const profile = adv.profile ?? "business";
  return (
    <div className="px-5 pt-3 pb-28 max-w-md mx-auto">
      <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300/70 mb-4" />

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="h-9 w-9 rounded-full bg-neutral-100 grid place-items-center hover:bg-neutral-200"
        >
          <ArrowLeft className="h-4 w-4 text-neutral-700" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-orange-500 uppercase tracking-wide">Advanced Settings</div>
          <div className="text-lg font-extrabold text-neutral-900 truncate">{productName}</div>
        </div>
        <ToggleSwitch on={active} onClick={onToggleActive} />
      </div>

      {/* Cover image */}
      <div className="rounded-2xl overflow-hidden bg-neutral-100 mb-4 aspect-[16/9] grid place-items-center relative">
        {adv.cover_url || productImage ? (
          <img src={adv.cover_url || productImage!} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="text-neutral-400 text-sm flex flex-col items-center gap-1">
            <ImageIcon className="h-6 w-6" /> Add cover image
          </div>
        )}
        <button className="absolute bottom-2 right-2 h-9 px-3 rounded-xl bg-white/90 text-neutral-800 text-xs font-bold flex items-center gap-1.5 shadow">
          <ImageIcon className="h-3.5 w-3.5" /> Upload
        </button>
      </div>

      {/* Profile selector */}
      <SectionTitle>Profile</SectionTitle>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { key: "personal", label: "Personal", Icon: Home },
          { key: "business", label: "Business", Icon: StoreIcon },
        ].map(({ key, label, Icon }) => {
          const on = profile === key;
          return (
            <button
              key={key}
              onClick={() => onPatch({ profile: key as any })}
              className={`rounded-2xl border-2 p-3 flex items-center gap-2 transition-all ${
                on ? "border-orange-500 bg-orange-50" : "border-neutral-200 bg-white"
              }`}
            >
              <div className={`h-9 w-9 rounded-xl grid place-items-center ${on ? "bg-orange-500 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-sm font-bold ${on ? "text-orange-600" : "text-neutral-900"}`}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Pricing */}
      <SectionTitle>Pricing</SectionTitle>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <PriceInput
          label="Basic Price"
          value={priceOv.basic ?? defaultBasic}
          onChange={(n) => onPatchPrice({ basic: n })}
        />
        <PriceInput
          label="Premium Price"
          value={priceOv.premium ?? defaultPremium}
          onChange={(n) => onPatchPrice({ premium: n })}
        />
      </div>
      <div className="mb-4">
        <PriceInput
          label="Offer Price (optional)"
          value={adv.offer_price ?? null}
          onChange={(n) => onPatch({ offer_price: n })}
        />
      </div>

      {/* Description */}
      <SectionTitle>Description</SectionTitle>
      <textarea
        value={adv.description ?? ""}
        onChange={(e) => onPatch({ description: e.target.value })}
        rows={3}
        placeholder="Describe your product/service…"
        className="w-full text-sm rounded-xl border border-neutral-200 bg-white px-3 py-2 outline-none focus:border-orange-400 resize-none mb-4"
      />

      {/* Estimated time */}
      <SectionTitle>Estimated Time</SectionTitle>
      <div className="rounded-xl border border-neutral-200 bg-white h-11 flex items-center px-3 gap-2 mb-4">
        <Clock className="h-4 w-4 text-neutral-400" />
        <input
          value={adv.estimated_time ?? ""}
          onChange={(e) => onPatch({ estimated_time: e.target.value })}
          placeholder="e.g. 2-3 days"
          className="flex-1 text-sm bg-transparent outline-none"
        />
      </div>

      {/* Service options */}
      <SectionTitle>Service Options</SectionTitle>
      <div className="space-y-2 mb-4">
        <OptionRow
          Icon={Home}
          label="Home Service Available"
          on={!!adv.home_service}
          onChange={(v) => onPatch({ home_service: v })}
        />
        <OptionRow
          Icon={StoreIcon}
          label="Shop Visit Available"
          on={!!adv.shop_visit}
          onChange={(v) => onPatch({ shop_visit: v })}
        />
        <OptionRow
          Icon={Zap}
          label="Emergency Service"
          on={!!adv.emergency}
          onChange={(v) => onPatch({ emergency: v })}
        />
      </div>

      {/* Media */}
      <SectionTitle>Media</SectionTitle>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <MediaTile Icon={ImageIcon} label="Product Gallery" hint={`${adv.gallery_urls?.length ?? 0} photos`} />
        <MediaTile Icon={Video} label="Video Upload" hint={adv.video_url ? "Uploaded" : "Add video"} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white to-transparent">
        <button
          onClick={onBack}
          className="w-full py-3 rounded-2xl bg-orange-500 text-white font-bold text-[15px] shadow-md hover:bg-orange-600"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-2">
      {children}
    </div>
  );
}

function OptionRow({
  Icon,
  label,
  on,
  onChange,
}: {
  Icon: any;
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
      <div className="h-9 w-9 rounded-xl bg-orange-50 grid place-items-center">
        <Icon className="h-4 w-4 text-orange-600" />
      </div>
      <div className="flex-1 text-sm font-semibold text-neutral-900">{label}</div>
      <ToggleSwitch on={on} onClick={() => onChange(!on)} />
    </div>
  );
}

function MediaTile({ Icon, label, hint }: { Icon: any; label: string; hint: string }) {
  return (
    <button className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-3 flex flex-col items-center gap-1.5 hover:border-orange-400 hover:bg-orange-50/40 transition">
      <div className="h-9 w-9 rounded-xl bg-neutral-100 grid place-items-center">
        <Icon className="h-4 w-4 text-neutral-600" />
      </div>
      <div className="text-[12px] font-bold text-neutral-900">{label}</div>
      <div className="text-[10px] text-neutral-500">{hint}</div>
    </button>
  );
}
