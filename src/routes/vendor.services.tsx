import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ChevronUp, Package, ArrowLeft, X, Pencil, Wrench, Boxes, MoreHorizontal, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { IconImage } from "@/components/admin/ImageUpload";
import { ItemPricingSheet, type PricingValues } from "@/components/ItemPricingSheet";
import { toast } from "sonner";
import { VendorAuthGate } from "@/components/VendorAuthGate";
import { CategorySuggestionSheet, type CategorySuggestionDefaults } from "@/components/CategorySuggestionSheet";

export const Route = createFileRoute("/vendor/services")({
  head: () => ({
    meta: [
      { title: "My Services — Vendor" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (<VendorAuthGate><VendorServicesPage /></VendorAuthGate>),
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
};

// Light theme tokens
const PAGE_BG = "linear-gradient(180deg, #fffdf6 0%, #fdf6e3 100%)";
const HEADING_GRAD = "linear-gradient(180deg, #6b4a12 0%, #b8860b 60%, #d4af37 100%)";

function typeIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("service") || n.includes("sarvic")) return Wrench;
  if (n.includes("product")) return Boxes;
  return MoreHorizontal;
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

  const [pickerOpen, setPickerOpen] = useState(false); // legacy — no longer used
  void pickerOpen;
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
    if (!uid) { setLoading(false); return; }

    const [t, c, i, mi, gr] = await Promise.all([
      supabase.from("catalog_types").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("catalog_items").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("vendor_item_mappings").select("item_id, price_min, price_max, notes, variations").eq("vendor_id", uid),
      (supabase.from as any)("catalog_groups").select("*").eq("is_active", true).order("sort_order"),
    ]);
    const typesData = (t.data ?? []) as Type[];
    const catsData = (c.data ?? []) as Cat[];
    const itemsData = (i.data ?? []) as Item[];
    setTypes(typesData);
    setCats(catsData);
    setItems(itemsData);
    setAllGroups((gr.data ?? []) as Group[]);
    const m = new Map<string, Mapping>();
    ((mi.data ?? []) as Mapping[]).forEach((row) => m.set(row.item_id, row));
    setMappings(m);

    setTypeId((prev) => prev ?? typesData[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let scheduled: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (scheduled) return;
      scheduled = setTimeout(() => { scheduled = null; load(); }, 400);
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

  useEffect(() => { setActiveGroup(""); }, [subId]);

  // (auto-open picker removed — categories/sub-categories are inline now)


  const rootCats = useMemo(() => cats.filter((c) => c.type_id === typeId && !c.parent_id), [cats, typeId]);
  const subCats = useMemo(() => cats.filter((c) => c.parent_id === catId), [cats, catId]);
  const subItems = useMemo(() => items.filter((it) => it.category_id === subId), [items, subId]);
  const subGroups = useMemo(
    () => allGroups.filter((g) => g.category_id === subId).sort((a, b) => a.sort_order - b.sort_order),
    [allGroups, subId]
  );
  

  // Parent-variation tabs — only from admin-managed catalog_groups (read-only for vendors)
  const groupTabs = useMemo<string[]>(() => subGroups.map((g) => g.name), [subGroups]);

  const visibleItems = useMemo(() => {
    if (!activeGroup) return subItems;
    return subItems.filter((it) => (it.group_tag ?? "").trim() === activeGroup);
  }, [subItems, activeGroup]);

  const currentCat = cats.find((c) => c.id === catId) ?? null;
  const currentSub = cats.find((c) => c.id === subId) ?? null;

  const turnOff = async (itemId: string) => {
    if (!userId) return;
    setSavingKey(itemId);
    const { error } = await supabase.from("vendor_item_mappings").delete().eq("vendor_id", userId).eq("item_id", itemId);
    setSavingKey(null);
    if (error) return toast.error(error.message);
    const n = new Map(mappings); n.delete(itemId); setMappings(n);
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
    });
    setMappings(n);
    setPricingItem(null);
    toast.success(existing ? "Updated" : "Service enabled — leads aane lagenge");
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: PAGE_BG }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#b8860b]" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen grid place-items-center text-center px-6" style={{ background: PAGE_BG }}>
        <div>
          <p className="text-[#3a2c10] mb-4">Please sign in as a vendor.</p>
          <Link to="/" className="text-[#b8860b] underline">Go home</Link>
        </div>
      </div>
    );
  }

  const BOTTOM_BARS_H = 72;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: PAGE_BG }}>
      <header className="sticky top-0 z-20 px-4 sm:px-6 pt-4 pb-2 border-b border-[#d4af37]/30 backdrop-blur-xl bg-white/85">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/vendor/dashboard" })}
            aria-label="Back"
            className="click-feedback h-10 w-10 grid place-items-center rounded-full border border-[#d4af37]/40 text-[#3a2c10] bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold" style={{ background: HEADING_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              My Services
            </h1>
            <p className="text-[11px] text-[#6b5a2e] mt-0.5 truncate">
              Type → Category → Sub-category → toggle ON karke rate set karein.
            </p>
          </div>
        </div>

        {/* ── TYPE PILLS (moved up from bottom bar) ── */}
        <div className="max-w-3xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {types.map((t) => {
            const active = t.id === typeId;
            const Icon = typeIcon(t.name);
            return (
              <button
                key={t.id}
                onClick={() => setTypeId(t.id)}
                className={`flex items-center gap-2 px-4 h-9 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                  active
                    ? "text-white border-[#b8860b] shadow-[0_3px_10px_-3px_rgba(217,119,6,0.5)]"
                    : "text-[#3a2c10] border-[#d4af37]/40 bg-white"
                }`}
                style={
                  active
                    ? { background: "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)" }
                    : undefined
                }
              >
                <Icon className="h-4 w-4" />
                {t.name}
              </button>
            );
          })}
        </div>
      </header>


      <main
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-3xl mx-auto w-full"
        style={{ paddingBottom: BOTTOM_BARS_H + 24 }}
      >
        <div className="mb-3">
          <h2 className="font-display text-xl font-bold text-[#2a1f08]">
            {currentSub?.name ?? "Select a sub-category"}
          </h2>
          <p className="text-[11px] text-[#6b5a2e]">
            ON karein wo services jo aap dete hain
          </p>
        </div>

        {/* Parent-variation tabs — admin-managed (read-only here, vendor only picks) */}
        <div className="mb-3 rounded-2xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[#d4af37]/40 p-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {groupTabs.map((g) => {
              const active = activeGroup === g;
              const meta = subGroups.find((x) => x.name === g);
              return (
                <button
                  key={g}
                  onClick={() => setActiveGroup(active ? "" : g)}
                  className={`snap-start shrink-0 flex flex-col items-center justify-center w-[78px] h-[88px] rounded-2xl px-1.5 py-1.5 gap-1 transition-all active:scale-95 border-2 ${
                    active
                      ? "bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-white border-[#b8860b] shadow-[0_4px_12px_-3px_rgba(217,119,6,0.55)]"
                      : "bg-white text-[#3a2c10] border-[#d4af37]/40"
                  }`}
                >
                  {meta ? (
                    <IconImage url={meta.image_url} icon={meta.icon} size={38} />
                  ) : (
                    <div
                      className={`h-[38px] w-[38px] rounded-xl grid place-items-center text-base font-black ${
                        active ? "bg-white/20" : "bg-[#fff8dc] text-[#b8860b]"
                      }`}
                    >
                      {g.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[10px] font-display font-bold uppercase tracking-wider truncate w-full text-center">
                    {g}
                  </span>
                </button>
              );
            })}
          </div>
        </div>




        {visibleItems.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-10 w-10 text-[#d4af37]/60 mx-auto mb-3" />
            <p className="text-sm text-[#6b5a2e]">Koi item nahi mila</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleItems.map((it) => {
              const mapping = mappings.get(it.id);
              const on = !!mapping;
              const busy = savingKey === it.id;
              return (
                <div
                  key={it.id}
                  className="rounded-2xl border p-3 flex items-center gap-3 bg-white"
                  style={{
                    background: on
                      ? "linear-gradient(180deg, rgba(34,197,94,0.10), rgba(255,255,255,1))"
                      : "#ffffff",
                    borderColor: on ? "rgba(34,197,94,0.55)" : "rgba(212,175,55,0.35)",
                    boxShadow: "0 1px 4px -1px rgba(120,90,20,0.10)",
                  }}
                >
                  <IconImage url={it.image_url} icon={it.icon} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2a1f08] truncate">{it.name}</p>
                    <p className="text-[11px] text-[#6b5a2e] truncate">
                      {on && (mapping!.price_min || mapping!.price_max)
                        ? `₹${mapping!.price_min ?? "?"} – ${mapping!.price_max ?? "?"}`
                        : it.price_min || it.price_max
                        ? `Suggested ₹${it.price_min ?? "?"} – ${it.price_max ?? "?"}`
                        : on
                        ? "Linked — leads ON"
                        : "Tap to enable"}
                    </p>
                    {on && mapping!.variations && mapping!.variations.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {mapping!.variations.slice(0, 3).map((v) => (
                          <span key={v} className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wider">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {on && (
                    <button
                      onClick={() => setPricingItem(it)}
                      className="h-8 w-8 rounded-full grid place-items-center bg-[#fff8dc] border border-[#d4af37]/50 text-[#b8860b]"
                      aria-label="Edit rate"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ToggleSwitch
                    on={on}
                    busy={busy}
                    onChange={() => (on ? turnOff(it.id) : setPricingItem(it))}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── BOTTOM BAR: category | sub-category | + suggest ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] bg-white/90 backdrop-blur-xl border-t border-[#d4af37]/30">
        <div className="max-w-3xl mx-auto flex items-stretch gap-2">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <PickerButton
              label={currentCat?.name ?? "Category"}
              disabled={rootCats.length === 0}
              onClick={() => setOpenPicker("cat")}
            />
            <PickerButton
              label={currentSub?.name ?? "Sub-category"}
              withImage
              disabled={subCats.length === 0}
              onClick={() => setOpenPicker("sub")}
            />
          </div>
          <button
            onClick={() => openSuggest({
              category_name: currentCat?.name ?? "",
              subcategory_name: currentSub?.name ?? "",
            })}
            aria-label="Suggest a new category"
            className="click-feedback h-11 w-11 grid place-items-center rounded-xl border border-[#d4af37]/60 text-[#1a1208] flex-shrink-0"
            style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37)" }}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>


      <PickerSheet
        open={openPicker === "cat"}
        title="Select category"
        subtitle={rootCats.length > 0 ? `${rootCats.length} categories linked to this type` : undefined}
        items={rootCats.map((c) => ({ id: c.id, name: c.name, icon: c.icon, image_url: c.image_url }))}
        selectedId={catId}
        onPick={(id) => {
          setCatId(id);
          setOpenPicker(null);
          // If picked category has sub-categories, chain-open the sub picker
          const hasSubs = cats.some((c) => c.parent_id === id);
          if (hasSubs) setTimeout(() => setOpenPicker("sub"), 260);
        }}
        onClose={() => setOpenPicker(null)}
      />

      <PickerSheet
        open={openPicker === "sub"}
        title="Select sub-category"
        subtitle={subCats.length > 0 ? `${subCats.length} sub-categories` : undefined}
        items={subCats.map((c) => ({ id: c.id, name: c.name, icon: c.icon, image_url: c.image_url }))}
        selectedId={subId}
        onPick={(id) => { setSubId(id); setOpenPicker(null); }}
        onClose={() => setOpenPicker(null)}
      />


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

      <CategorySuggestionSheet
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        defaults={suggestDefaults}
      />
    </div>
  );
}

function PickerButton({
  label,
  withImage,
  disabled,
  onClick,
}: {
  label: string;
  withImage?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="click-feedback h-11 rounded-xl flex items-center gap-2 px-3 text-left border border-[#d4af37]/40 bg-white disabled:opacity-50"
    >
      <span className="h-7 w-7 rounded-md grid place-items-center bg-[#fff8dc] border border-[#d4af37]/50 text-[#b8860b] flex-shrink-0">
        {withImage ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="11" r="1.5" />
            <path d="m21 17-5-5-9 9" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.5 14.5 11 5l-7 .5-.5 7L13 22l7.5-7.5z" />
          </svg>
        )}
      </span>
      <span className="text-sm font-semibold text-[#2a1f08] truncate flex-1">{label}</span>
      <ChevronUp className="h-4 w-4 text-[#b8860b] flex-shrink-0" />
    </button>
  );
}

function PickerSheet({
  open,
  title,
  subtitle,
  items,
  selectedId,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  items: { id: string; name: string; icon?: string | null; image_url?: string | null }[];
  selectedId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[80vh] rounded-t-[28px] flex flex-col"
            style={{
              background: "linear-gradient(180deg, #fffdf6 0%, #fdf6e3 100%)",
              borderTop: "1px solid rgba(212,175,55,0.5)",
            }}
          >
            <div className="pt-2.5 pb-1 grid place-items-center">
              <span className="block h-1.5 w-12 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
            </div>
            <div className="px-5 pb-3 pt-1 flex items-start gap-3 border-b border-[#d4af37]/30">
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-[#2a1f08]">{title}</h3>
                {subtitle && <p className="text-[11px] text-[#6b5a2e] mt-0.5 truncate">{subtitle}</p>}
              </div>
              <button onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-full grid place-items-center border border-[#d4af37]/40 text-[#3a2c10] bg-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 pb-[max(env(safe-area-inset-bottom),16px)]">
              {items.length === 0 ? (
                <p className="text-sm text-[#6b5a2e] text-center py-8">Empty</p>
              ) : (
                items.map((it) => {
                  const on = it.id === selectedId;
                  return (
                    <button
                      key={it.id}
                      onClick={() => onPick(it.id)}
                      className="w-full rounded-2xl border p-3 flex items-center gap-3 text-left transition active:scale-[0.99]"
                      style={{
                        background: on
                          ? "linear-gradient(180deg, #fff3c4, #ffe79a)"
                          : "#ffffff",
                        borderColor: on ? "#d4af37" : "rgba(212,175,55,0.35)",
                        boxShadow: on
                          ? "0 4px 14px -6px rgba(180,130,20,0.35)"
                          : "0 1px 3px -1px rgba(120,90,20,0.10)",
                      }}
                    >
                      <div className="h-12 w-12 rounded-2xl overflow-hidden bg-[#fff8dc] border border-[#d4af37]/40 grid place-items-center flex-shrink-0">
                        <IconImage url={it.image_url ?? null} icon={it.icon ?? null} size={46} />
                      </div>
                      <span className="flex-1 text-base font-bold text-[#2a1f08] truncate">
                        {it.name}
                      </span>
                      {on && (
                        <span className="h-6 w-6 rounded-full grid place-items-center bg-[#b8860b] text-white flex-shrink-0">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


function ToggleSwitch({ on, busy, onChange }: { on: boolean; busy: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      disabled={busy}
      aria-pressed={on}
      className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-60 ${
        on ? "bg-emerald-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        } grid place-items-center`}
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin text-gray-500" />}
      </span>
    </button>
  );
}
