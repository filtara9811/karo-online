import { useEffect, useMemo, useState } from "react";
import { X, Mic, ShoppingCart, Check, Star, Truck, Store, Factory, Users, SlidersHorizontal } from "lucide-react";
import { QuickNotesPopup } from "./QuickNotesPopup";

export type VariationItem = {
  id: string;
  title: string;
  sub: string;
  price: string;
  img: string;
  tone?: "gold" | "green";
  /** Optional grouping tag — e.g. "Women", "Men", "Kids", "Unisex". Drives the tab strip. */
  group?: string;
};

export type VariationGroup = {
  name: string;
  icon?: string | null;
  image_url?: string | null;
};


export type VendorTypeKey = "wholesaler" | "retailer" | "manufacturer";

type Props = {
  open: boolean;
  category: string | null;
  vendorLabel?: string;
  items: VariationItem[];
  groups?: VariationGroup[];
  selectedVendors?: { id: string; name: string; avatar?: string | null }[];
  onClose: () => void;
  onSubmit: (payload: {
    cart: string[];
    note: string;
    images: string[];
    vendorTypes: VendorTypeKey[];
    filters: Record<string, string[]>;
    remote: boolean;
  }) => void;
};

type FilterGroup = { key: string; label: string; options: string[] };

const SERVICE_FILTERS: FilterGroup[] = [
  { key: "urgency", label: "Urgency", options: ["Today", "Tomorrow", "This week", "Anytime"] },
  { key: "timeSlot", label: "Time slot", options: ["Morning", "Afternoon", "Evening"] },
  { key: "budget", label: "Budget", options: ["Under ₹500", "₹500–₹2000", "₹2000+"] },
];

const PRODUCT_FILTERS: FilterGroup[] = [
  { key: "color", label: "Color", options: ["White", "Black", "Brown", "Grey", "Gold", "Other"] },
  { key: "design", label: "Design", options: ["Modern", "Classic", "Minimal", "Premium"] },
  { key: "budget", label: "Budget", options: ["Under ₹500", "₹500–₹2000", "₹2000+"] },
];

function isServiceCategory(c?: string | null) {
  if (!c) return false;
  return /service|repair|install|clean|fix|paint|plumb|electric|carpenter|salon|laundry/i.test(c);
}

const VENDOR_TYPES: { key: VendorTypeKey; label: string; Icon: typeof Truck }[] = [
  { key: "wholesaler", label: "Wholesaler", Icon: Truck },
  { key: "retailer", label: "Retailer", Icon: Store },
  { key: "manufacturer", label: "Manufacturer", Icon: Factory },
];

export function VariationSheet({ open, category, vendorLabel, items, groups, selectedVendors = [], onClose, onSubmit }: Props) {
  const [cart, setCart] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [notesPopupOpen, setNotesPopupOpen] = useState(false);
  // by default ALL vendor types are selected → request goes to everyone
  const [vendorTypes, setVendorTypes] = useState<VendorTypeKey[]>(["wholesaler", "retailer", "manufacturer"]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [remote, setRemote] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>("");

  // Group tabs — prefer admin-managed groups (with images), fall back to inferred from items.
  const groupMeta = useMemo<VariationGroup[]>(() => groups ?? [], [groups]);

  const groupTabs = useMemo<string[]>(() => {
    if (groupMeta.length > 0) return groupMeta.map((g) => g.name);
    const set = new Set<string>();
    items.forEach((it) => { if (it.group) set.add(it.group); });
    return Array.from(set);
  }, [items, groupMeta]);

  const visibleItems = useMemo(() => {
    if (!activeGroup) return items;
    return items.filter((it) => it.group === activeGroup);
  }, [items, activeGroup]);

  const isService = useMemo(() => isServiceCategory(category), [category]);
  const filterGroups = isService ? SERVICE_FILTERS : PRODUCT_FILTERS;
  const activeFilterCount =
    Object.values(filters).reduce((n, arr) => n + arr.length, 0) +
    (vendorTypes.length < 3 ? 1 : 0);


  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-variation-open", "true");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.body.removeAttribute("data-variation-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setCart([items[0]?.id].filter(Boolean) as string[]);
      setNote("");
      setImages([]);
      setVendorTypes(["wholesaler", "retailer", "manufacturer"]);
      setFilters({});
      setFilterSheetOpen(false);
      setRemote(false);
      setActiveGroup("");
    }
  }, [open, items]);


  const toggleCart = (id: string) =>
    setCart((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const toggleType = (key: VendorTypeKey) =>
    setVendorTypes((p) => {
      // never let the user end up with zero — keep at least one selected
      if (p.includes(key)) return p.length === 1 ? p : p.filter((x) => x !== key);
      return [...p, key];
    });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.55)] backdrop-blur-sm"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)] max-h-[88vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
        style={{ animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
        </div>

        <div className="px-5 pt-1 pb-3 flex items-center justify-between border-b border-[color:oklch(0.78_0.14_82/0.25)] flex-shrink-0">
          <h3 className="font-display text-lg font-bold text-[color:oklch(0.25_0.05_85)] underline underline-offset-4">
            Choice variations
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Hero card — selected vendors top-left */}
          <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.4)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {selectedVendors.length > 0 ? (
                    <>
                      <div className="flex -space-x-2">
                        {selectedVendors.slice(0, 4).map((v) => (
                          <div
                            key={v.id}
                            className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-[#fbbf24] to-[#d97706] grid place-items-center text-[10px] font-bold text-white overflow-hidden"
                            title={v.name}
                          >
                            {v.avatar ? (
                              <img src={v.avatar} alt={v.name} className="h-full w-full object-cover" />
                            ) : (
                              v.name.slice(0, 1).toUpperCase()
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] font-display font-semibold text-[color:oklch(0.35_0.08_85)]">
                        {selectedVendors.length} vendor{selectedVendors.length > 1 ? "s" : ""} selected
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-display italic text-[color:oklch(0.45_0.08_85)]">
                      <Users className="h-3.5 w-3.5" />
                      Nearby vendors will be matched
                    </span>
                  )}
                </div>
                <p className="text-xs text-[color:oklch(0.55_0.10_82)] font-display italic">
                  {vendorLabel ?? "Choose your variations"}
                </p>
                <h4 className="font-display text-xl font-bold text-[color:oklch(0.25_0.05_85)] mt-0.5">
                  {category ?? "Service"} | <span className="font-semibold">Vendor</span>
                </h4>
              </div>
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3 w-3 text-amber-500" fill="currentColor" />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-[color:oklch(0.30_0.05_85)] whitespace-nowrap">⭐ Top rated</span>
              </div>
            </div>
          </div>

          {/* Grouped tabs — Women / Men / Kids / Unisex / Other (only when groups exist) */}
          {groupTabs.length > 0 && (
            <div
              className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] border border-[color:oklch(0.78_0.14_82/0.4)] p-2"
              style={{ animation: "fade-up 0.4s ease-out 0.05s both" }}
            >
              <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory">
                {groupTabs.map((g) => {
                  const active = activeGroup === g;
                  const meta = groupMeta.find((m) => m.name === g);
                  const showImage = !!meta && (meta.image_url || meta.icon);
                  return (
                    <button
                      key={g}
                      onClick={() => setActiveGroup(active ? "" : g)}
                      className={`snap-start shrink-0 flex flex-col items-center justify-center w-[76px] h-[88px] rounded-2xl px-1.5 py-1.5 gap-1 transition-all active:scale-95 border-2 ${
                        active
                          ? "bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-white border-[color:oklch(0.55_0.18_60)] shadow-[0_3px_10px_-2px_rgba(217,119,6,0.45)]"
                          : "bg-white text-[color:oklch(0.30_0.05_85)] border-[color:oklch(0.78_0.14_82/0.4)]"
                      }`}
                    >
                      {showImage && meta!.image_url ? (
                        <img
                          src={meta!.image_url!}
                          alt={g}
                          className="h-[38px] w-[38px] rounded-xl object-cover bg-[#fff8dc]"
                        />
                      ) : showImage && meta!.icon ? (
                        <div className="h-[38px] w-[38px] rounded-xl grid place-items-center text-xl bg-[#fff8dc]">
                          {meta!.icon}
                        </div>
                      ) : (
                        <div className={`h-[38px] w-[38px] rounded-xl grid place-items-center text-base font-black ${
                          active ? "bg-white/20" : "bg-[#fff8dc] text-[#b8860b]"
                        }`}>
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
          )}

          {/* Items */}
          <div className="px-4 mt-3 space-y-2.5 pb-4">
            {visibleItems.length === 0 && (
              <p className="text-center text-[12px] font-display italic text-[color:oklch(0.50_0.05_85)] py-6">
                No options in this tab yet.
              </p>
            )}
            {visibleItems.map((item, i) => {
              const inCart = cart.includes(item.id);
              return (
                <article
                  key={item.id}
                  className={`rounded-2xl bg-white border-2 p-2.5 flex items-center gap-3 transition-all ${
                    inCart
                      ? "border-[color:oklch(0.78_0.14_82)] shadow-gold-glow"
                      : "border-[color:oklch(0.78_0.14_82/0.25)]"
                  }`}
                  style={{ animation: `fade-up 0.4s ease-out ${i * 0.06}s both` }}
                >
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#f0f9ff] to-[#e0f2fe] grid place-items-center flex-shrink-0 overflow-hidden border border-[color:oklch(0.78_0.14_82/0.3)]">
                    <img src={item.img} alt={item.title} loading="lazy" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-display text-base font-bold text-[color:oklch(0.25_0.05_85)] leading-tight">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-[color:oklch(0.50_0.08_85/0.8)] mt-0.5">{item.sub}</p>
                    <p className="text-[11px] font-bold text-[color:oklch(0.55_0.18_60)] mt-0.5">{item.price}</p>
                  </div>
                  <button
                    onClick={() => toggleCart(item.id)}
                    className={`btn-3d flex-shrink-0 px-3 py-2 rounded-full font-display font-bold text-[11px] flex items-center gap-1.5 active:scale-95 ${
                      inCart
                        ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_3px_10px_-2px_rgba(5,150,105,0.5)]"
                        : "bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-white shadow-[0_3px_10px_-2px_rgba(217,119,6,0.5)]"
                    }`}
                  >
                    {inCart ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.5} />}
                    {inCart ? "ADDED" : "ADD TO CART"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>


        {/* Footer — vendor type filter chips + notes line + send */}
        <div
          className="flex-shrink-0 mx-3 mb-3 rounded-2xl bg-gradient-to-b from-[#f59e0b] to-[#d97706] p-3 shadow-[0_-4px_18px_-4px_rgba(217,119,6,0.6)]"
          style={{ animation: "fade-up 0.4s ease-out 0.2s both" }}
        >
          {/* Notes line — tap text OR mic to open the notes popup */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setNotesPopupOpen(true)}
              className="flex-1 text-left bg-transparent border-b-2 border-white/50 text-white text-sm py-1 outline-none font-display italic active:opacity-80 truncate"
            >
              {note ? <span className="text-white">{note}</span> : <span className="text-white/70">Quick notes…</span>}
            </button>
            <button
              onClick={() => setNotesPopupOpen(true)}
              aria-label="Voice notes"
              className="h-9 w-9 rounded-full grid place-items-center bg-white/20 text-white active:scale-90"
            >
              <Mic className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </div>

          {/* Filter button (left) + photos count + Send Inquiry (green) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterSheetOpen(true)}
              aria-label="Open filters"
              className="relative h-10 px-3 rounded-2xl bg-white/95 text-[color:oklch(0.30_0.05_85)] inline-flex items-center gap-1.5 font-display font-bold text-[11px] shadow-[0_3px_10px_-2px_rgba(0,0,0,0.2)] active:scale-95"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2.4} />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 h-5 min-w-[20px] px-1 grid place-items-center rounded-full bg-[color:oklch(0.55_0.18_60)] text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <span className="text-white/90 text-[11px] font-display italic truncate">
              {images.length > 0
                ? `${images.length} photo${images.length > 1 ? "s" : ""}`
                : "No photos"}
            </span>
            <button
              onClick={() => onSubmit({ cart, note, images, vendorTypes, filters, remote })}
              disabled={cart.length === 0}
              className="btn-3d ml-auto px-5 py-2.5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-display font-bold text-sm shadow-[0_4px_14px_-2px_rgba(5,150,105,0.55)] active:scale-95 disabled:opacity-50"
            >
              Send Inquiry
            </button>
          </div>
        </div>
      </div>

      {/* Filter bottom sheet — multi-select, product vs service aware */}
      {filterSheetOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <button
            aria-label="Close filters"
            onClick={() => setFilterSheetOpen(false)}
            className="absolute inset-0 bg-[oklch(0.05_0.02_18/0.55)] backdrop-blur-sm"
            style={{ animation: "overlay-in 0.25s ease-out" }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)] max-h-[78vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
            style={{ animation: "sheet-up 0.4s cubic-bezier(0.22,1,0.36,1)" }}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
            </div>
            <div className="px-5 pt-1 pb-3 flex items-center justify-between border-b border-[color:oklch(0.78_0.14_82/0.25)]">
              <h3 className="font-display text-lg font-bold text-[color:oklch(0.25_0.05_85)] underline underline-offset-4">
                Filters {isService ? "· Service" : "· Product"}
              </h3>
              <button
                onClick={() => setFilterSheetOpen(false)}
                aria-label="Close"
                className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.4)] active:scale-90"
              >
                <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Vendor type group */}
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:oklch(0.45_0.08_85)] mb-2 font-bold">
                  Vendor type
                </p>
                <div className="flex flex-wrap gap-2">
                  {VENDOR_TYPES.map(({ key, label, Icon }) => {
                    const active = vendorTypes.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleType(key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-display font-bold border-2 transition-all active:scale-95 ${
                          active
                            ? "bg-[color:oklch(0.55_0.18_60)] text-white border-[color:oklch(0.55_0.18_60)]"
                            : "bg-white text-[color:oklch(0.30_0.05_85)] border-[color:oklch(0.78_0.14_82/0.4)]"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                        {label}
                        {active && <Check className="h-3 w-3" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remote / Online services — bypasses proximity radius */}
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[color:oklch(0.45_0.08_85)] mb-2 font-bold">
                  Service mode
                </p>
                <button
                  onClick={() => setRemote((r) => !r)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                    remote
                      ? "bg-gradient-to-r from-[#3b82f6] to-[#6366f1] text-white border-[#3b82f6]"
                      : "bg-white text-[color:oklch(0.30_0.05_85)] border-[color:oklch(0.78_0.14_82/0.4)]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-display font-bold">
                    🌐 Remote / Online service
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${remote ? "bg-white/25" : "bg-gray-100"}`}>
                    {remote ? "ON — global match" : "OFF — nearby only"}
                  </span>
                </button>
                <p className="text-[10px] text-[color:oklch(0.50_0.05_85)] mt-1.5">
                  Turn ON for services that don't need physical visit. Distance is ignored.
                </p>
              </div>


              {filterGroups.map((g) => {
                const selected = filters[g.key] ?? [];
                return (
                  <div key={g.key}>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:oklch(0.45_0.08_85)] mb-2 font-bold">
                      {g.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {g.options.map((opt) => {
                        const active = selected.includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() =>
                              setFilters((p) => {
                                const cur = p[g.key] ?? [];
                                const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
                                return { ...p, [g.key]: next };
                              })
                            }
                            className={`px-3 py-2 rounded-full text-[12px] font-display font-bold border-2 transition-all active:scale-95 ${
                              active
                                ? "bg-[color:oklch(0.55_0.18_60)] text-white border-[color:oklch(0.55_0.18_60)]"
                                : "bg-white text-[color:oklch(0.30_0.05_85)] border-[color:oklch(0.78_0.14_82/0.4)]"
                            }`}
                          >
                            {opt}
                            {active && <Check className="h-3 w-3 inline ml-1" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 px-5 py-3 border-t border-[color:oklch(0.78_0.14_82/0.25)]">
              <button
                onClick={() => {
                  setFilters({});
                  setVendorTypes(["wholesaler", "retailer", "manufacturer"]);
                }}
                className="px-4 py-2.5 rounded-2xl bg-white text-[color:oklch(0.35_0.05_85)] font-display font-bold text-sm border-2 border-[color:oklch(0.78_0.14_82/0.4)] active:scale-95"
              >
                Reset
              </button>
              <button
                onClick={() => setFilterSheetOpen(false)}
                className="btn-3d ml-auto px-6 py-2.5 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-display font-bold text-sm shadow-[0_4px_14px_-2px_rgba(5,150,105,0.55)] active:scale-95"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      <QuickNotesPopup
        open={notesPopupOpen}
        initialNote={note}
        onClose={() => setNotesPopupOpen(false)}
        onSubmit={({ note: n, images: imgs }) => {
          setNote(n);
          setImages((prev) => [...prev, ...imgs].slice(0, 4));
          setNotesPopupOpen(false);
        }}
      />
    </div>
  );
}
