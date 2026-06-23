import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronUp, Package, ArrowLeft, X, Pencil, Wrench, Boxes, MoreHorizontal, Plus } from "lucide-react";
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

type Cat = { id: string; name: string; parent_id: string | null; type_id: string | null; is_active: boolean };
type Item = { id: string; category_id: string; name: string; image_url: string | null; icon: string | null; price_min: number | null; price_max: number | null; is_active: boolean };
type Type = { id: string; name: string; icon: string | null; is_active: boolean };
type Mapping = {
  item_id: string;
  price_min: number | null;
  price_max: number | null;
  notes: string | null;
  variations: string[] | null;
};

const GOLD_BG = "radial-gradient(circle at 20% 0%, oklch(0.22 0.04 80) 0%, oklch(0.10 0.02 80) 70%)";
const GOLD_GRAD = "linear-gradient(180deg, #f5f6f8 0%, #d8dde3 35%, #a8acb3 100%)";

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
  const [mappings, setMappings] = useState<Map<string, Mapping>>(new Map());
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Current selection (drives the items list shown on top)
  const [typeId, setTypeId] = useState<string | null>(null);
  const [catId, setCatId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);

  // Picker sheets
  const [openPicker, setOpenPicker] = useState<null | "cat" | "sub">(null);

  // Pricing sheet
  const [pricingItem, setPricingItem] = useState<Item | null>(null);

  // Category suggestion sheet
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

    const [t, c, i, mi] = await Promise.all([
      supabase.from("catalog_types").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("catalog_items").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("vendor_item_mappings").select("item_id, price_min, price_max, notes, variations").eq("vendor_id", uid),
    ]);
    const typesData = (t.data ?? []) as Type[];
    const catsData = (c.data ?? []) as Cat[];
    const itemsData = (i.data ?? []) as Item[];
    setTypes(typesData);
    setCats(catsData);
    setItems(itemsData);
    const m = new Map<string, Mapping>();
    ((mi.data ?? []) as Mapping[]).forEach((row) => m.set(row.item_id, row));
    setMappings(m);

    // initialize selection
    setTypeId((prev) => prev ?? typesData[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Realtime: instantly reflect Admin catalog edits (new categories / items / variations) in vendor mapping flow.
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
      .subscribe();
    return () => {
      if (scheduled) clearTimeout(scheduled);
      supabase.removeChannel(channel);
    };
  }, []);

  // Reset child selection on parent change
  useEffect(() => {
    const rootCats = cats.filter((c) => c.type_id === typeId && !c.parent_id);
    setCatId((cur) => (cur && rootCats.some((c) => c.id === cur) ? cur : rootCats[0]?.id ?? null));
  }, [typeId, cats]);

  useEffect(() => {
    const subs = cats.filter((c) => c.parent_id === catId);
    setSubId((cur) => (cur && subs.some((c) => c.id === cur) ? cur : subs[0]?.id ?? null));
  }, [catId, cats]);

  const rootCats = useMemo(() => cats.filter((c) => c.type_id === typeId && !c.parent_id), [cats, typeId]);
  const subCats = useMemo(() => cats.filter((c) => c.parent_id === catId), [cats, catId]);
  const subItems = useMemo(() => items.filter((it) => it.category_id === subId), [items, subId]);

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
      <div className="min-h-screen grid place-items-center" style={{ background: GOLD_BG }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#a8acb3]" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen grid place-items-center text-center px-6" style={{ background: GOLD_BG }}>
        <div>
          <p className="text-[#f5f6f8] mb-4">Please sign in as a vendor.</p>
          <Link to="/" className="text-[#a8acb3] underline">Go home</Link>
        </div>
      </div>
    );
  }

  // Bottom bars height (type pills 56 + cat/sub 56) — keep top list above this.
  const BOTTOM_BARS_H = 124;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: GOLD_BG }}>
      <header className="sticky top-0 z-20 px-4 sm:px-6 py-4 border-b border-[#a8acb3]/20 backdrop-blur-xl bg-black/30">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/vendor/dashboard" })}
            aria-label="Back"
            className="click-feedback h-10 w-10 grid place-items-center rounded-full border border-[#a8acb3]/30 text-[#f5f6f8] bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold" style={{ background: GOLD_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              My Services
            </h1>
            <p className="text-[11px] text-[#d8dde3]/60 mt-1 truncate">
              Type → Category → Sub-category → toggle ON karke rate set karein.
            </p>
          </div>
        </div>
      </header>

      {/* ITEMS LIST — top area */}
      <main
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-3xl mx-auto w-full"
        style={{ paddingBottom: BOTTOM_BARS_H + 24 }}
      >
        <div className="mb-3">
          <h2 className="font-display text-xl font-bold text-[#f5f6f8]">
            {currentSub?.name ?? "Select a sub-category"}
          </h2>
          <p className="text-[11px] text-[#d8dde3]/55">
            ON karein wo services jo aap dete hain
          </p>
        </div>

        {subItems.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-10 w-10 text-[#a8acb3]/40 mx-auto mb-3" />
            <p className="text-sm text-[#d8dde3]/60">Koi item nahi mila</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {subItems.map((it) => {
              const mapping = mappings.get(it.id);
              const on = !!mapping;
              const busy = savingKey === it.id;
              return (
                <div
                  key={it.id}
                  className="rounded-2xl border p-3 flex items-center gap-3"
                  style={{
                    background: on
                      ? "linear-gradient(180deg, rgba(34,197,94,0.16), rgba(34,197,94,0.05))"
                      : "linear-gradient(180deg, rgba(255,253,245,0.05), rgba(255,253,245,0.02))",
                    borderColor: on ? "rgba(34,197,94,0.55)" : "rgba(212,175,55,0.25)",
                  }}
                >
                  <IconImage url={it.image_url} icon={it.icon} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#f5f6f8] truncate">{it.name}</p>
                    <p className="text-[11px] text-[#d8dde3]/60 truncate">
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
                          <span key={v} className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 font-bold uppercase tracking-wider">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {on && (
                    <button
                      onClick={() => setPricingItem(it)}
                      className="h-8 w-8 rounded-full grid place-items-center bg-white/5 border border-[#d4af37]/30 text-[#d4af37]"
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

      {/* ── BOTTOM BAR 2: category | sub-category | + suggest ── */}
      <div
        className="fixed inset-x-0 z-30 px-3"
        style={{ bottom: 56 + 8, paddingBottom: 0 }}
      >
        <div className="max-w-3xl mx-auto flex items-stretch gap-2 rounded-2xl border border-[#d4af37]/25 bg-black/55 backdrop-blur-xl p-1.5">
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
            className="click-feedback h-11 w-11 grid place-items-center rounded-xl border border-[#d4af37]/50 text-[#1a1208] flex-shrink-0"
            style={{ background: "linear-gradient(180deg, #f5d97a, #d4af37)" }}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>


      {/* ── BOTTOM BAR 1: type pills ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-black/70 backdrop-blur-xl border-t border-[#d4af37]/20 pb-[max(env(safe-area-inset-bottom),6px)]">
        <div className="max-w-3xl mx-auto flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
          {types.map((t) => {
            const active = t.id === typeId;
            const Icon = typeIcon(t.name);
            return (
              <button
                key={t.id}
                onClick={() => setTypeId(t.id)}
                className={`flex items-center gap-2 px-4 h-10 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                  active
                    ? "text-[#fff8dc] border-[#d4af37]"
                    : "text-[#d8dde3]/80 border-transparent"
                }`}
                style={
                  active
                    ? { background: "linear-gradient(180deg, #6b3a18 0%, #3a1d08 100%)" }
                    : { background: "rgba(255,255,255,0.04)" }
                }
              >
                <Icon className="h-4 w-4" />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category picker sheet */}
      <PickerSheet
        open={openPicker === "cat"}
        title="Select category"
        items={rootCats.map((c) => ({ id: c.id, name: c.name }))}
        selectedId={catId}
        onPick={(id) => { setCatId(id); setOpenPicker(null); }}
        onClose={() => setOpenPicker(null)}
      />

      {/* Sub-category picker sheet */}
      <PickerSheet
        open={openPicker === "sub"}
        title="Select sub-category"
        items={subCats.map((c) => ({ id: c.id, name: c.name }))}
        selectedId={subId}
        onPick={(id) => { setSubId(id); setOpenPicker(null); }}
        onClose={() => setOpenPicker(null)}
      />

      {/* Pricing sheet */}
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
      className="click-feedback h-11 rounded-xl flex items-center gap-2 px-3 text-left border border-[#d4af37]/20 bg-white/5 disabled:opacity-50"
    >
      <span className="h-7 w-7 rounded-md grid place-items-center bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] flex-shrink-0">
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
      <span className="text-sm font-semibold text-[#f5f6f8] truncate flex-1">{label}</span>
      <ChevronUp className="h-4 w-4 text-[#a8acb3]/70 flex-shrink-0" />
    </button>
  );
}

function PickerSheet({
  open,
  title,
  items,
  selectedId,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  items: { id: string; name: string }[];
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
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[70vh] rounded-t-[28px] flex flex-col"
            style={{
              background: "linear-gradient(180deg, #1a1208 0%, #0f0a04 100%)",
              borderTop: "1px solid rgba(212,175,55,0.3)",
            }}
          >
            <div className="pt-2.5 pb-1 grid place-items-center">
              <span className="block h-1.5 w-12 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-70" />
            </div>
            <div className="px-5 pb-3 pt-1 flex items-start gap-3 border-b border-[#d4af37]/15">
              <h3 className="flex-1 font-display text-lg font-bold text-[#f5f6f8]">{title}</h3>
              <button onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-full grid place-items-center border border-[#a8acb3]/30 text-[#f5f6f8] bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-[#d8dde3]/60 text-center py-8">Empty</p>
              ) : (
                items.map((it) => {
                  const on = it.id === selectedId;
                  return (
                    <button
                      key={it.id}
                      onClick={() => onPick(it.id)}
                      className="w-full rounded-2xl border p-3.5 text-left text-sm font-semibold text-[#f5f6f8] transition"
                      style={{
                        background: on
                          ? "linear-gradient(180deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))"
                          : "linear-gradient(180deg, rgba(255,253,245,0.05), rgba(255,253,245,0.02))",
                        borderColor: on ? "rgba(212,175,55,0.6)" : "rgba(212,175,55,0.2)",
                      }}
                    >
                      {it.name}
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
        on ? "bg-emerald-500" : "bg-gray-500/50"
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
