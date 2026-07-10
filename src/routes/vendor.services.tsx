import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Package,
  ArrowLeft,
  Pencil,
  Wrench,
  Boxes,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  ClipboardList,
  ChevronRight,
  Clock,
  Shield,
  Award,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { IconImage } from "@/components/admin/ImageUpload";
import { ItemPricingSheet, type PricingValues } from "@/components/ItemPricingSheet";
import { toast } from "sonner";
import { VendorAuthGate } from "@/components/VendorAuthGate";
import { CategorySuggestionSheet, type CategorySuggestionDefaults } from "@/components/CategorySuggestionSheet";
import { SheetShell } from "@/components/vendor/SheetShell";

export const Route = createFileRoute("/vendor/services")({
  head: () => ({
    meta: [
      { title: "My Services — Vendor" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <VendorAuthGate>
      <SheetShell>
        <VendorServicesPage />
      </SheetShell>
    </VendorAuthGate>
  ),
});

type Cat = { id: string; name: string; parent_id: string | null; type_id: string | null; is_active: boolean; group_tag?: string | null; icon: string | null; image_url: string | null };
type Item = { id: string; category_id: string; name: string; image_url: string | null; icon: string | null; price_min: number | null; price_max: number | null; is_active: boolean; group_tag?: string | null };
type Type = { id: string; name: string; icon: string | null; is_active: boolean };
type Group = { id: string; category_id: string; name: string; icon: string | null; image_url: string | null; sort_order: number; is_active: boolean };
type Mapping = {
  item_id: string;
  price_min: number | null;
  price_max: number | null;
  notes: string | null;
  variations: string[] | null;
  updated_at?: string | null;
};

const PAGE_BG = "linear-gradient(180deg, #fffdf6 0%, #fdf6e3 100%)";
const HEADING_GRAD = "linear-gradient(180deg, #6b4a12 0%, #b8860b 60%, #d4af37 100%)";
const GOLD_GRAD = "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)";

function typeIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("service") || n.includes("sarvic")) return Wrench;
  if (n.includes("product")) return Boxes;
  return MoreHorizontal;
}

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const d = Math.floor(diff / 86_400_000);
  if (d >= 1) return `Updated ${d}d ago`;
  const h = Math.floor(diff / 3_600_000);
  if (h >= 1) return `Updated ${h}h ago`;
  const m = Math.floor(diff / 60_000);
  return `Updated ${Math.max(1, m)}m ago`;
}

function VendorServicesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [types, setTypes] = useState<Type[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [mappings, setMappings] = useState<Map<string, Mapping>>(new Map());
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [typeId, setTypeId] = useState<string | null>(null);
  const [catId, setCatId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>("");
  const [search, setSearch] = useState("");

  const [pricingItem, setPricingItem] = useState<Item | null>(null);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestDefaults, setSuggestDefaults] = useState<CategorySuggestionDefaults>({});
  const openSuggest = (defaults: CategorySuggestionDefaults = {}) => {
    setSuggestDefaults(defaults);
    setSuggestOpen(true);
  };

  const load = async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id ?? null;
    setUserId(uid);
    if (!uid) {
      setLoading(false);
      return;
    }

    const [t, c, i, mi, gr] = await Promise.all([
      supabase.from("catalog_types").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("catalog_items").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase
        .from("vendor_item_mappings")
        .select("item_id, price_min, price_max, notes, variations, updated_at")
        .eq("vendor_id", uid),
      (supabase.from as any)("catalog_groups").select("*").eq("is_active", true).order("sort_order"),
    ]);
    const typesData = (t.data ?? []) as Type[];
    setTypes(typesData);
    setCats((c.data ?? []) as Cat[]);
    setItems((i.data ?? []) as Item[]);
    setAllGroups((gr.data ?? []) as Group[]);
    const m = new Map<string, Mapping>();
    ((mi.data ?? []) as Mapping[]).forEach((row) => m.set(row.item_id, row));
    setMappings(m);
    setTypeId((prev) => prev ?? typesData[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let scheduled: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (scheduled) return;
      scheduled = setTimeout(() => {
        scheduled = null;
        load();
      }, 400);
    };
    const channel = supabase
      .channel("vendor-services-catalog-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_types" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_items" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "item_variations" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_groups" }, bump)
      .subscribe();
    return () => {
      if (scheduled) clearTimeout(scheduled);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const rootCats = cats.filter((c) => c.type_id === typeId && !c.parent_id);
    setCatId((cur) => (cur && rootCats.some((c) => c.id === cur) ? cur : rootCats[0]?.id ?? null));
  }, [typeId, cats]);

  useEffect(() => {
    const subs = cats.filter((c) => c.parent_id === catId);
    setSubId((cur) => (cur && subs.some((c) => c.id === cur) ? cur : subs[0]?.id ?? null));
  }, [catId, cats]);

  useEffect(() => {
    const groups = allGroups.filter((g) => g.category_id === subId).sort((a, b) => a.sort_order - b.sort_order);
    setActiveGroup(groups[0]?.name ?? "");
  }, [subId, allGroups]);

  const rootCats = useMemo(() => cats.filter((c) => c.type_id === typeId && !c.parent_id), [cats, typeId]);
  const subCats = useMemo(() => cats.filter((c) => c.parent_id === catId), [cats, catId]);
  const subItems = useMemo(() => items.filter((it) => it.category_id === subId), [items, subId]);
  const subGroups = useMemo(
    () => allGroups.filter((g) => g.category_id === subId).sort((a, b) => a.sort_order - b.sort_order),
    [allGroups, subId]
  );
  const groupTabs = useMemo<string[]>(() => subGroups.map((g) => g.name), [subGroups]);

  const visibleItems = useMemo(() => {
    let list = activeGroup ? subItems.filter((it) => (it.group_tag ?? "").trim() === activeGroup) : subItems;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((it) => it.name.toLowerCase().includes(q));
    return list;
  }, [subItems, activeGroup, search]);

  const currentCat = cats.find((c) => c.id === catId) ?? null;
  const currentSub = cats.find((c) => c.id === subId) ?? null;

  const turnOff = async (itemId: string) => {
    if (!userId) return;
    setSavingKey(itemId);
    const { error } = await supabase.from("vendor_item_mappings").delete().eq("vendor_id", userId).eq("item_id", itemId);
    setSavingKey(null);
    if (error) return toast.error(error.message);
    const n = new Map(mappings);
    n.delete(itemId);
    setMappings(n);
    toast.success("Service removed");
  };

  const savePricing = async (vals: PricingValues) => {
    if (!userId || !pricingItem) return;
    const existing = mappings.get(pricingItem.id);
    setSavingKey(pricingItem.id);
    const payload = {
      vendor_id: userId,
      item_id: pricingItem.id,
      is_active: true,
      price_min: vals.price_min,
      price_max: vals.price_max,
      notes: vals.notes || null,
      variations: vals.variations,
    };
    const { error } = existing
      ? await supabase.from("vendor_item_mappings").update(payload).eq("vendor_id", userId).eq("item_id", pricingItem.id)
      : await supabase.from("vendor_item_mappings").insert(payload);
    setSavingKey(null);
    if (error) return toast.error(error.message);
    const n = new Map(mappings);
    n.set(pricingItem.id, {
      item_id: pricingItem.id,
      price_min: vals.price_min,
      price_max: vals.price_max,
      notes: vals.notes,
      variations: vals.variations,
      updated_at: new Date().toISOString(),
    });
    setMappings(n);
    setPricingItem(null);
    toast.success(existing ? "Updated" : "Service enabled — leads aane lagenge");
  };

  if (loading) {
    return (
      <div className="min-h-full grid place-items-center" style={{ background: PAGE_BG }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#b8860b]" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-full grid place-items-center text-center px-6" style={{ background: PAGE_BG }}>
        <div>
          <p className="text-[#3a2c10] mb-4">Please sign in as a vendor.</p>
          <Link to="/" className="text-[#b8860b] underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col" style={{ background: PAGE_BG }}>
      {/* ─── HEADER ─── */}
      <header className="px-4 pt-3 pb-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate({ to: "/vendor/dashboard" })}
            aria-label="Back"
            className="h-10 w-10 shrink-0 grid place-items-center rounded-full border border-[#d4af37]/40 text-[#3a2c10] bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1
              className="font-display text-[22px] leading-tight font-bold"
              style={{ background: HEADING_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              My Services / Mapping
            </h1>
            <p className="text-[10.5px] text-[#6b5a2e] mt-0.5 truncate">
              Type <span className="text-[#b8860b]">→</span> Category <span className="text-[#b8860b]">→</span> Sub-category{" "}
              <span className="text-[#b8860b]">→</span> Toggle ON karein
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/vendor/listing" })}
            className="shrink-0 h-10 rounded-full pl-3 pr-2.5 flex items-center gap-1.5 border border-[#d4af37]/60 bg-white text-[#3a2c10]"
          >
            <ClipboardList className="h-4 w-4 text-[#b8860b]" />
            <span className="text-[12px] font-bold">My Listing</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#b8860b]" />
          </button>
        </div>

        {/* Type tabs */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {types.map((t) => {
            const active = t.id === typeId;
            const Icon = typeIcon(t.name);
            return (
              <button
                key={t.id}
                onClick={() => setTypeId(t.id)}
                className={`h-11 rounded-full text-[13px] font-bold flex items-center justify-center gap-1.5 border transition ${
                  active
                    ? "text-white border-[#b8860b] shadow-[0_3px_10px_-3px_rgba(217,119,6,0.5)]"
                    : "text-[#3a2c10] border-[#d4af37]/40 bg-white"
                }`}
                style={active ? { background: GOLD_GRAD } : undefined}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{t.name}</span>
              </button>
            );
          })}
        </div>

        {/* Search + filter */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-11 rounded-full bg-white border border-[#d4af37]/30 flex items-center gap-2 px-4 shadow-[0_1px_4px_-2px_rgba(120,90,20,0.15)]">
            <Search className="h-4 w-4 text-[#b8860b]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service, category, etc…"
              className="flex-1 bg-transparent outline-none text-[13px] text-[#2a1f08] placeholder:text-[#a89364]"
            />
          </div>
          <button
            onClick={() =>
              openSuggest({ category_name: currentCat?.name ?? "", subcategory_name: currentSub?.name ?? "" })
            }
            aria-label="Filter"
            className="h-11 w-11 rounded-xl bg-white border border-[#d4af37]/40 grid place-items-center text-[#b8860b]"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 px-4 pb-24">
        {/* ─── MAIN CATEGORIES ─── */}
        {rootCats.length > 0 && (
          <section className="mt-1">
            <SectionHeader title="Main Categories" onViewAll={() => {}} />
            <div className="mt-2 -mx-4 px-4 flex items-stretch gap-3 overflow-x-auto no-scrollbar snap-x">
              {rootCats.map((rc) => {
                const active = rc.id === catId;
                return (
                  <button
                    key={rc.id}
                    onClick={() => setCatId(rc.id)}
                    className="snap-start shrink-0 w-[76px] flex flex-col items-center gap-1.5 active:scale-95 transition"
                  >
                    <div
                      className={`h-[62px] w-[62px] rounded-2xl grid place-items-center transition ${
                        active ? "" : "bg-white border border-[#e9d68a]/60"
                      }`}
                      style={
                        active
                          ? {
                              background: "radial-gradient(circle at 50% 50%, #fff3c4 0%, #ffe79a 70%, transparent 100%)",
                            }
                          : undefined
                      }
                    >
                      <IconImage url={rc.image_url} icon={rc.icon} size={44} />
                    </div>
                    <span
                      className={`text-[11px] leading-tight text-center line-clamp-2 ${
                        active ? "font-bold text-[#8b6508]" : "font-semibold text-[#2a1f08]"
                      }`}
                    >
                      {rc.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── SUB-CATEGORIES ─── */}
        <section className="mt-4">
          <SectionHeader title="Sub-categories" suffix={currentCat?.name} onViewAll={() => {}} />
          {subCats.length === 0 ? (
            <p className="text-[11px] text-[#6b5a2e] mt-2">No sub-categories</p>
          ) : (
            <div className="mt-2 -mx-4 px-4 flex items-stretch gap-2.5 overflow-x-auto no-scrollbar snap-x">
              {subCats.map((sc) => {
                const active = sc.id === subId;
                return (
                  <button
                    key={sc.id}
                    onClick={() => setSubId(sc.id)}
                    className={`snap-start shrink-0 w-[86px] rounded-2xl p-2 flex flex-col items-center gap-1 transition active:scale-95 border-2 ${
                      active
                        ? "border-[#d4af37] bg-[#fffbe6] shadow-[0_3px_10px_-4px_rgba(180,130,20,0.4)]"
                        : "border-transparent bg-white"
                    }`}
                  >
                    <IconImage url={sc.image_url} icon={sc.icon} size={40} />
                    <span className="text-[10.5px] font-bold leading-tight text-center text-[#2a1f08] line-clamp-2">
                      {sc.name}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => openSuggest({ category_name: currentCat?.name ?? "" })}
                className="snap-start shrink-0 w-[76px] rounded-2xl border-2 border-dashed border-[#d4af37]/60 text-[#b8860b] text-[11px] font-bold flex flex-col items-center justify-center gap-1"
              >
                <Plus className="h-4 w-4" strokeWidth={3} /> Add
              </button>
            </div>
          )}
        </section>

        {/* ─── VARIATIONS ─── */}
        {groupTabs.length > 0 && (
          <section className="mt-4">
            <SectionHeader title="Variations" suffix={currentSub?.name} onViewAll={() => {}} />
            <div className="mt-2 -mx-4 px-4 flex gap-2.5 overflow-x-auto no-scrollbar snap-x">
              {groupTabs.map((g) => {
                const active = activeGroup === g;
                const meta = subGroups.find((x) => x.name === g);
                return (
                  <button
                    key={g}
                    onClick={() => setActiveGroup(g)}
                    className={`snap-start shrink-0 w-[86px] rounded-2xl p-2 flex flex-col items-center gap-1 transition active:scale-95 border-2 ${
                      active
                        ? "border-[#d4af37] bg-[#fffbe6] shadow-[0_3px_10px_-4px_rgba(180,130,20,0.4)]"
                        : "border-transparent bg-white"
                    }`}
                  >
                    {meta ? (
                      <IconImage url={meta.image_url} icon={meta.icon} size={40} />
                    ) : (
                      <div className="h-10 w-10 rounded-xl grid place-items-center bg-[#fff8dc] text-[#b8860b] font-black">
                        {g.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10.5px] font-bold leading-tight text-center text-[#2a1f08] line-clamp-2">
                      {g}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── ITEMS ─── */}
        <div className="flex items-center justify-between gap-2 mt-5 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block h-3.5 w-1 rounded-full bg-gradient-to-b from-[#fbbf24] to-[#b8860b]" />
            <h2 className="font-display text-[15px] font-bold text-[#2a1f08] truncate">
              Services / Products
              {activeGroup && <span className="text-[#b8860b]"> ({activeGroup})</span>}
            </h2>
          </div>
          <button
            onClick={() =>
              openSuggest({ category_name: currentCat?.name ?? "", subcategory_name: currentSub?.name ?? "" })
            }
            className="shrink-0 h-8 rounded-full px-3 flex items-center gap-1 border border-[#d4af37]/60 bg-white text-[11.5px] font-bold text-[#b8860b]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Add New Service
          </button>
        </div>

        {visibleItems.length === 0 ? (
          <div className="text-center py-14 rounded-2xl border border-dashed border-[#d4af37]/40 bg-white/60">
            <Package className="h-10 w-10 text-[#d4af37]/60 mx-auto mb-3" />
            <p className="text-sm text-[#6b5a2e]">Koi item nahi mila</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {visibleItems.map((it, idx) => {
              const mapping = mappings.get(it.id);
              const on = !!mapping;
              const busy = savingKey === it.id;
              const basic = on ? mapping!.price_min : it.price_min;
              const premium = on ? mapping!.price_max : it.price_max;
              const suggested = !on && (it.price_min != null || it.price_max != null);
              return (
                <motion.li
                  key={it.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.25 }}
                  className="rounded-2xl bg-white border border-[#e9d68a]/60 shadow-[0_2px_8px_-4px_rgba(180,130,20,0.18)] p-3"
                >
                  <div className="flex gap-3">
                    <div className="h-[72px] w-[72px] rounded-2xl bg-[#fff8dc] border border-[#e9d68a]/60 grid place-items-center overflow-hidden shrink-0">
                      <IconImage url={it.image_url} icon={it.icon} size={68} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[14px] font-bold text-[#2a1f08] leading-tight truncate">
                        {it.name}
                      </p>
                      <p className="text-[10.5px] text-[#6b5a2e] truncate mt-0.5">
                        {mapping?.notes || `${it.name} — quality assured`}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <Meta icon={Clock} label="30 - 45 min" />
                        <Meta icon={Shield} label="Home Service" />
                        <Meta icon={Award} label="Standard" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-[#f0e4b8] flex items-end gap-2">
                    <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                      <PriceCol label="Basic Price" value={basic} muted={suggested} />
                      <PriceCol label="Premium Price" value={premium} muted={suggested} />
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPricingItem(it)}
                          className="h-7 w-7 rounded-md border border-[#e9d68a] grid place-items-center text-[#b8860b] active:scale-90"
                          aria-label="Edit price"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <ToggleSwitch
                          on={on}
                          busy={busy}
                          onChange={() => (on ? turnOff(it.id) : setPricingItem(it))}
                        />
                      </div>
                      {on ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9.5px] font-bold">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f2ecdc] text-[#8b7a4a] text-[9.5px] font-bold">
                          Inactive
                        </span>
                      )}
                      {mapping?.updated_at && (
                        <span className="text-[9px] text-[#8b7a4a] leading-none">
                          {timeAgo(mapping.updated_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Floating FAB */}
      <button
        onClick={() =>
          openSuggest({ category_name: currentCat?.name ?? "", subcategory_name: currentSub?.name ?? "" })
        }
        aria-label="Suggest a new category"
        className="fixed z-30 h-14 w-14 grid place-items-center rounded-full border border-white text-[#1a1208] shadow-[0_10px_24px_-8px_rgba(180,130,20,0.7)]"
        style={{
          background: GOLD_GRAD,
          right: 18,
          bottom: `calc(env(safe-area-inset-bottom, 0px) + 20px)`,
        }}
      >
        <Plus className="h-6 w-6" strokeWidth={2.8} />
      </button>

      <ItemPricingSheet
        open={!!pricingItem}
        itemName={pricingItem?.name ?? ""}
        initial={
          pricingItem && mappings.get(pricingItem.id)
            ? {
                price_min: mappings.get(pricingItem.id)!.price_min,
                price_max: mappings.get(pricingItem.id)!.price_max,
                notes: mappings.get(pricingItem.id)!.notes ?? "",
                variations: mappings.get(pricingItem.id)!.variations ?? [],
              }
            : undefined
        }
        busy={savingKey === pricingItem?.id}
        onClose={() => setPricingItem(null)}
        onSave={savePricing}
      />

      <CategorySuggestionSheet open={suggestOpen} onClose={() => setSuggestOpen(false)} defaults={suggestDefaults} />
    </div>
  );
}

function SectionHeader({
  title,
  suffix,
  onViewAll,
}: {
  title: string;
  suffix?: string | null;
  onViewAll?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-block h-3.5 w-1 rounded-full bg-gradient-to-b from-[#fbbf24] to-[#b8860b]" />
        <span className="text-[13px] font-bold text-[#2a1f08]">{title}</span>
        {suffix ? <span className="text-[11px] font-bold text-[#b8860b] truncate">({suffix})</span> : null}
      </div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="shrink-0 flex items-center gap-0.5 text-[11px] font-bold text-[#b8860b]"
        >
          View All <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function Meta({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[#8b7a4a] font-semibold">
      <Icon className="h-3 w-3 text-[#b8860b]" />
      {label}
    </span>
  );
}

function PriceCol({ label, value, muted }: { label: string; value: number | null; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] text-[#8b7a4a] font-semibold uppercase tracking-wide leading-none">{label}</p>
      <p
        className={`font-display text-[15px] font-bold tabular-nums leading-tight mt-0.5 truncate ${
          muted ? "text-[#a89364]" : "text-[#3a2c10]"
        }`}
      >
        {value != null ? `₹${value.toLocaleString("en-IN")}` : "—"}
      </p>
    </div>
  );
}

function ToggleSwitch({ on, busy, onChange }: { on: boolean; busy: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      disabled={busy}
      aria-pressed={on}
      className="relative h-6 w-11 rounded-full transition-colors disabled:opacity-60"
      style={on ? { background: GOLD_GRAD } : { background: "oklch(0.88 0.02 60)" }}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all grid place-items-center ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin text-gray-500" />}
      </span>
    </button>
  );
}
