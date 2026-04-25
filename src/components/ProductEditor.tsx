import { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Plus,
  Check,
  Layers,
  Trash2,
  Image as ImageIcon,
  Video,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Tag,
  Tags,
  Percent,
  FileText,
  ShieldCheck,
  Pencil,
  GripVertical,
  Star as StarIcon,
  Mic,
  MicOff,
  Store,
  Package,
  TrendingDown,
  Smile,
} from "lucide-react";
import type { Product } from "@/lib/products";
import { useVoiceInput } from "@/hooks/use-voice-input";

export type Variation = {
  id: string;
  label: string;
  price: number;
  image?: string;
  color?: string;
  size?: string;
};
export type MediaItem = { id: string; type: "image" | "video"; url: string };

export type SaleType = "wholesale" | "retail" | "both";

export type BulkTier = {
  id: string;
  minQty: number;
  price: number;
};

export type CategoryItem = {
  name: string;
  icon?: string; // emoji
  image?: string; // dataURL
};

export type EditorProduct = Product & {
  theme?: "classic" | "minimal" | "bold" | "luxe";
  media?: MediaItem[];
  buyingPrice?: number;
  sellingPrice?: number;
  gstPercent?: number;
  gstMode?: "include" | "exclude";
  variationsList?: Variation[];
  terms?: string;
  policy?: string;
  priceLabels?: { buying: string; selling: string; mrp: string };
  categoryTags?: string[];
  primaryCategory?: string;
  saleType?: SaleType;
  bulkTiers?: BulkTier[];
  customCategories?: CategoryItem[];
};

const THEMES: { value: NonNullable<EditorProduct["theme"]>; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "luxe", label: "Luxe" },
];

export const SHOP_CATEGORIES = [
  "Beauty",
  "Fashion",
  "Home",
  "Kitchen",
  "Electronics",
  "Grocery",
  "Wellness",
  "Jewellery",
  "Accessories",
  "Stationery",
  "Toys",
  "Festive",
  "Premium",
  "Bestseller",
  "New Arrival",
];

const DEFAULT_LABELS = { buying: "Buying Price", selling: "Selling Price", mrp: "MRP" };


export function ProductEditor({
  product,
  onSave,
  onClose,
}: {
  product: EditorProduct;
  onSave: (p: EditorProduct) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<EditorProduct>(() => ({
    media:
      product.media && product.media.length
        ? product.media
        : product.image
          ? [{ id: "m0", type: "image", url: product.image }]
          : [],
    buyingPrice: product.buyingPrice ?? 0,
    sellingPrice: product.sellingPrice ?? product.price ?? 0,
    gstPercent: product.gstPercent ?? 18,
    gstMode: product.gstMode ?? "include",
    variationsList:
      product.variationsList ??
      (product.variations ?? []).map((v, i) => ({
        id: `v${i}`,
        label: v.label,
        price: product.price,
      })),
    terms: product.terms ?? "",
    policy: product.policy ?? "",
    priceLabels: product.priceLabels ?? DEFAULT_LABELS,
    categoryTags:
      product.categoryTags ??
      (product.category ? [product.category] : []),
    primaryCategory: product.primaryCategory ?? product.category ?? "",
    saleType: product.saleType ?? "retail",
    bulkTiers: product.bulkTiers ?? [],
    customCategories: product.customCategories ?? [],
    ...product,
  }));

  const [customCat, setCustomCat] = useState("");
  const [sheet, setSheet] = useState<null | "category" | "variation" | "pricing">(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [cropOpen, setCropOpen] = useState<MediaItem | null>(null);
  const [editingLabel, setEditingLabel] = useState<keyof typeof DEFAULT_LABELS | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const media = draft.media ?? [];

  // Bulk tier helpers
  const addBulkTier = () => {
    const lastQty = (draft.bulkTiers ?? []).slice(-1)[0]?.minQty ?? 0;
    setDraft((d) => ({
      ...d,
      bulkTiers: [
        ...(d.bulkTiers ?? []),
        {
          id: `bt-${Date.now()}`,
          minQty: lastQty ? lastQty * 2 : 10,
          price: Math.max(0, (d.sellingPrice ?? 0) - 50),
        },
      ],
    }));
  };
  const updateBulkTier = (id: string, patch: Partial<BulkTier>) => {
    setDraft((d) => ({
      ...d,
      bulkTiers: (d.bulkTiers ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };
  const removeBulkTier = (id: string) => {
    setDraft((d) => ({ ...d, bulkTiers: (d.bulkTiers ?? []).filter((t) => t.id !== id) }));
  };


  const addMedia = (kind: "image" | "video", e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const remaining = Math.max(0, 6 - media.length);
    const slice = Array.from(files).slice(0, remaining);
    const reads = slice.map(
      (f) =>
        new Promise<MediaItem>((res) => {
          const reader = new FileReader();
          reader.onload = () =>
            res({ id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: kind, url: String(reader.result) });
          reader.readAsDataURL(f);
        })
    );
    Promise.all(reads).then((arr) => {
      setDraft((d) => {
        const next = [...(d.media ?? []), ...arr];
        return { ...d, media: next, image: next[0]?.type === "image" ? next[0].url : d.image };
      });
    });
    e.target.value = "";
  };

  const removeMedia = (id: string) => {
    setDraft((d) => {
      const next = (d.media ?? []).filter((m) => m.id !== id);
      return { ...d, media: next, image: next.find((m) => m.type === "image")?.url ?? "" };
    });
    setActiveIdx(0);
  };

  const swipeGallery = (dir: 1 | -1) => {
    setActiveIdx((i) => {
      const next = i + dir;
      const max = media.length;
      if (next < 0) return 0;
      if (next > max) return max;
      return next;
    });
  };

  const updateVariation = (id: string, patch: Partial<Variation>) => {
    setDraft((d) => ({
      ...d,
      variationsList: (d.variationsList ?? []).map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  };

  const addVariation = () => {
    setDraft((d) => ({
      ...d,
      variationsList: [
        ...(d.variationsList ?? []),
        { id: `v-${Date.now()}`, label: "", price: d.sellingPrice ?? 0 },
      ],
    }));
  };

  const removeVariation = (id: string) => {
    setDraft((d) => ({ ...d, variationsList: (d.variationsList ?? []).filter((v) => v.id !== id) }));
  };

  // Computed pricing
  const sellingPrice = draft.sellingPrice ?? 0;
  const gst = draft.gstPercent ?? 0;
  const priceWithGst =
    draft.gstMode === "include" ? sellingPrice : sellingPrice + (sellingPrice * gst) / 100;
  const priceWithoutGst =
    draft.gstMode === "include" ? sellingPrice / (1 + gst / 100) : sellingPrice;
  const margin = sellingPrice - (draft.buyingPrice ?? 0);

  const handleSave = () => {
    const finalImage =
      (draft.media ?? []).find((m) => m.type === "image")?.url || draft.image || "";
    onSave({
      ...draft,
      image: finalImage,
      price: draft.sellingPrice ?? draft.price,
      variations: (draft.variationsList ?? []).map((v) => ({ label: v.label, value: v.label.toLowerCase() })),
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.3s ease-out" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[94vh] flex flex-col"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 35%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>
        <div className="px-5 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ Edit Product ✦
            </p>
            <h3 className="font-display text-lg text-gold-gradient font-bold">
              {product.name ? "Update Listing" : "New Listing"}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          {/* === MEDIA GALLERY === */}
          <section>
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Media · {media.length}/6
              </label>
              <span className="text-[9px] text-[color:oklch(0.55_0.10_82)] italic">
                front · back · left · right + video
              </span>
            </div>

            {/* Hero swipe */}
            <div
              ref={galleryRef}
              className="mt-1 relative w-full aspect-video rounded-2xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.5)] overflow-hidden bg-white/60"
            >
              {media[activeIdx] ? (
                media[activeIdx].type === "image" ? (
                  <img
                    src={media[activeIdx].url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={media[activeIdx].url}
                    className="h-full w-full object-cover"
                    controls
                    playsInline
                  />
                )
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="h-full w-full grid place-items-center text-[color:oklch(0.42_0.10_82)]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="h-8 w-8" />
                    <span className="text-xs font-bold">Tap to upload first image</span>
                  </div>
                </button>
              )}

              {media.length > 0 && (
                <>
                  {activeIdx > 0 && (
                    <button
                      onClick={() => swipeGallery(-1)}
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 backdrop-blur grid place-items-center shadow"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
                    </button>
                  )}
                  {activeIdx < media.length - 1 && (
                    <button
                      onClick={() => swipeGallery(1)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 backdrop-blur grid place-items-center shadow"
                      aria-label="Next"
                    >
                      <ChevronRight className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
                    </button>
                  )}
                  {/* Action chips on hero */}
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    {media[activeIdx]?.type === "image" && (
                      <button
                        onClick={() => setCropOpen(media[activeIdx])}
                        className="px-2 py-1 rounded-full bg-white/95 text-[10px] font-bold text-[color:oklch(0.42_0.10_82)] flex items-center gap-1 shadow"
                      >
                        <ZoomIn className="h-3 w-3" /> Crop
                      </button>
                    )}
                    <button
                      onClick={() => removeMedia(media[activeIdx].id)}
                      className="h-7 w-7 rounded-full bg-white/95 grid place-items-center shadow"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </button>
                  </div>
                  {/* Indicator dots */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                    {media.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i === activeIdx ? "w-4 bg-[#d4af37]" : "w-1.5 bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip + plus */}
            <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {media.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setActiveIdx(i)}
                  className={`relative h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden border-2 transition ${
                    i === activeIdx
                      ? "border-[#d4af37] shadow-md"
                      : "border-[color:oklch(0.78_0.14_82/0.35)]"
                  }`}
                >
                  {m.type === "image" ? (
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-black/80 grid place-items-center">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 text-[8px] uppercase font-bold text-white bg-black/40 text-center py-0.5">
                    {["Front", "Back", "Left", "Right", "Extra", "Video"][i] ?? "More"}
                  </span>
                </button>
              ))}
              {media.length < 6 && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    aria-label="Add image"
                    className="h-14 w-14 flex-shrink-0 rounded-xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center bg-white/70"
                  >
                    <Plus className="h-5 w-5 text-[#d4af37]" />
                  </button>
                  <button
                    onClick={() => videoRef.current?.click()}
                    aria-label="Add video"
                    className="h-14 w-14 flex-shrink-0 rounded-xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center bg-white/70"
                  >
                    <Video className="h-5 w-5 text-[#d4af37]" />
                  </button>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addMedia("image", e)}
            />
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => addMedia("video", e)}
            />
          </section>

          {/* === SHOP CATEGORY MAPPING TRIGGER === */}
          <SheetTriggerRow
            icon={<Tags className="h-3.5 w-3.5" />}
            title="Shop Category Mapping"
            hint="visible in customer dukan"
            value={
              (draft.categoryTags ?? []).length
                ? `${(draft.categoryTags ?? []).length} mapped${
                    draft.primaryCategory ? ` · primary: ${draft.primaryCategory}` : ""
                  }`
                : "Tap to choose categories"
            }
            onClick={() => setSheet("category")}
          />

          {/* === BASIC === */}
          <Field
            label="Product Name"
            value={draft.name}
            onChange={(v) => setDraft({ ...draft, name: v })}
            placeholder="e.g. Maison Cosmetics"
          />
          <Field
            label="Tagline"
            value={draft.tagline}
            onChange={(v) => setDraft({ ...draft, tagline: v })}
            placeholder="Short catchy line"
          />
          <Field
            label="Description"
            value={draft.description}
            onChange={(v) => setDraft({ ...draft, description: v })}
            placeholder="Detailed description"
            multiline
          />

          {/* === PRICING with editable labels === */}
          <section className="rounded-2xl bg-white/80 border border-[color:oklch(0.78_0.14_82/0.5)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold flex items-center gap-1">
                <Tag className="h-3 w-3" /> Pricing
              </p>
              <span className="text-[9px] italic text-[color:oklch(0.55_0.10_82)]">
                tap label to rename
              </span>
            </div>

            {(["buying", "selling", "mrp"] as const).map((key) => {
              const labelText = draft.priceLabels?.[key] ?? DEFAULT_LABELS[key];
              const value =
                key === "buying"
                  ? draft.buyingPrice ?? 0
                  : key === "selling"
                    ? draft.sellingPrice ?? 0
                    : draft.mrp ?? 0;
              return (
                <div key={key} className="flex items-center gap-2">
                  {editingLabel === key ? (
                    <input
                      autoFocus
                      value={labelText}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          priceLabels: {
                            ...(draft.priceLabels ?? DEFAULT_LABELS),
                            [key]: e.target.value,
                          },
                        })
                      }
                      onBlur={() => setEditingLabel(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingLabel(null)}
                      className="flex-1 text-[11px] font-display font-bold bg-[#fff8dc] border border-[#d4af37] rounded-md px-2 py-1 outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingLabel(key)}
                      className="flex-1 text-left text-[11px] font-display font-bold text-[color:oklch(0.42_0.10_82)] flex items-center gap-1"
                    >
                      {labelText}
                      <Pencil className="h-2.5 w-2.5 opacity-50" />
                    </button>
                  )}
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[color:oklch(0.55_0.10_82)]">
                      ₹
                    </span>
                    <input
                      value={value || ""}
                      onChange={(e) => {
                        const n = Number(e.target.value) || 0;
                        if (key === "buying") setDraft({ ...draft, buyingPrice: n });
                        else if (key === "selling") setDraft({ ...draft, sellingPrice: n });
                        else setDraft({ ...draft, mrp: n });
                      }}
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      className="w-28 rounded-lg bg-white border border-[color:oklch(0.78_0.14_82/0.5)] pl-6 pr-2 py-1.5 text-sm font-bold text-right outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
              );
            })}

            {/* GST */}
            <div className="border-t border-dashed border-[color:oklch(0.78_0.14_82/0.4)] pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Percent className="h-3 w-3 text-[#d4af37]" />
                <span className="text-[11px] font-display font-bold text-[color:oklch(0.42_0.10_82)] flex-1">
                  GST
                </span>
                <input
                  value={draft.gstPercent ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, gstPercent: Number(e.target.value) || 0 })
                  }
                  type="number"
                  placeholder="18"
                  className="w-16 rounded-lg bg-white border border-[color:oklch(0.78_0.14_82/0.5)] px-2 py-1 text-sm font-bold text-right outline-none focus:border-[#d4af37]"
                />
                <span className="text-xs">%</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["include", "exclude"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDraft({ ...draft, gstMode: m })}
                    className={`py-1.5 rounded-lg text-[10px] font-display font-bold border-2 uppercase ${
                      draft.gstMode === m
                        ? "text-[color:oklch(0.18_0.06_18)] border-[#d4af37] bg-gradient-to-b from-[#fff3c8] to-[#f5d97a]"
                        : "text-[color:oklch(0.55_0.10_82)] border-[color:oklch(0.78_0.14_82/0.3)] bg-white"
                    }`}
                  >
                    {m === "include" ? "Inc. GST" : "+ GST extra"}
                  </button>
                ))}
              </div>

              {/* Calculated breakdown */}
              <div className="rounded-xl bg-gradient-to-b from-[#fff8dc] to-white p-2 text-[11px] space-y-0.5">
                <Row label="Base (excl. GST)" value={`₹${priceWithoutGst.toFixed(0)}`} />
                <Row label={`GST @ ${gst}%`} value={`₹${(priceWithGst - priceWithoutGst).toFixed(0)}`} />
                <div className="flex items-center justify-between pt-0.5 border-t border-dashed border-[color:oklch(0.78_0.14_82/0.4)]">
                  <span className="font-display font-bold">Final Price</span>
                  <span className="font-display font-bold text-gold-gradient">
                    ₹{priceWithGst.toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[color:oklch(0.55_0.10_82)]">Margin</span>
                  <span
                    className={`font-bold ${margin >= 0 ? "text-emerald-600" : "text-rose-500"}`}
                  >
                    ₹{margin.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* === VARIATIONS TRIGGER === */}
          <SheetTriggerRow
            icon={<Layers className="h-3.5 w-3.5" />}
            title="Attributes & Variations"
            hint="size · color · image"
            value={
              (draft.variationsList ?? []).length
                ? `${(draft.variationsList ?? []).length} variation${
                    (draft.variationsList ?? []).length > 1 ? "s" : ""
                  }`
                : "Tap to add (size, color, image)"
            }
            onClick={() => setSheet("variation")}
          />

          {/* === META === */}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Category"
              value={draft.category}
              onChange={(v) => setDraft({ ...draft, category: v })}
              placeholder="Beauty"
            />
            <Field
              label="Badge"
              value={draft.badge ?? ""}
              onChange={(v) => setDraft({ ...draft, badge: v })}
              placeholder="Bestseller"
            />
          </div>

          {/* === TERMS / POLICY === */}
          <section className="rounded-2xl bg-white/80 border border-[color:oklch(0.78_0.14_82/0.5)] p-3 space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold flex items-center gap-1">
                <FileText className="h-3 w-3" /> Terms & Conditions
              </label>
              <textarea
                value={draft.terms ?? ""}
                onChange={(e) => setDraft({ ...draft, terms: e.target.value })}
                placeholder="Return / exchange terms, warranty, delivery TAT..."
                rows={3}
                className="mt-1 w-full rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] px-3 py-2 text-xs outline-none focus:border-[#d4af37]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Product Policy
              </label>
              <textarea
                value={draft.policy ?? ""}
                onChange={(e) => setDraft({ ...draft, policy: e.target.value })}
                placeholder="Shipping, refund, replacement policy..."
                rows={3}
                className="mt-1 w-full rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] px-3 py-2 text-xs outline-none focus:border-[#d4af37]"
              />
            </div>
          </section>

          {/* === THEME === */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold flex items-center gap-1">
              <Layers className="h-3 w-3" /> Display Theme
            </label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setDraft({ ...draft, theme: t.value })}
                  className={`px-2 py-2 rounded-xl text-[10px] font-display font-bold border-2 transition ${
                    draft.theme === t.value
                      ? "text-[color:oklch(0.18_0.06_18)] border-[#d4af37] shadow-md"
                      : "text-[color:oklch(0.55_0.10_82)] border-[color:oklch(0.78_0.14_82/0.3)] bg-white"
                  }`}
                  style={
                    draft.theme === t.value
                      ? { background: "linear-gradient(180deg, #fff3c8, #f5d97a)" }
                      : undefined
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pt-2 pb-3 border-t border-[color:oklch(0.78_0.14_82/0.3)]">
          <button
            onClick={handleSave}
            disabled={!draft.name || !(draft.sellingPrice ?? 0)}
            className="btn-3d w-full py-3 rounded-2xl font-display font-bold text-base text-[color:oklch(0.18_0.06_18)] shadow-gold-glow disabled:opacity-50"
            style={{
              background:
                "linear-gradient(180deg, #fff3c8 0%, #f5d97a 35%, #d4af37 70%, #8b6508 100%)",
            }}
          >
            <Check className="inline h-4 w-4 mr-1" strokeWidth={3} /> Save Product
          </button>
        </div>
      </div>

      {/* Bottom sheets */}
      {sheet === "category" && (
        <CategoryBottomSheet
          tags={draft.categoryTags ?? []}
          primary={draft.primaryCategory ?? ""}
          customCat={customCat}
          setCustomCat={setCustomCat}
          onClose={() => setSheet(null)}
          onChange={(tags, primary) =>
            setDraft((d) => ({
              ...d,
              categoryTags: tags,
              primaryCategory: primary,
              category: primary || d.category,
            }))
          }
        />
      )}
      {sheet === "variation" && (
        <VariationBottomSheet
          variations={draft.variationsList ?? []}
          defaultPrice={draft.sellingPrice ?? 0}
          onClose={() => setSheet(null)}
          onChange={(list) => setDraft((d) => ({ ...d, variationsList: list }))}
        />
      )}

      {/* Crop overlay */}
      {cropOpen && (
        <CropOverlay
          item={cropOpen}
          onClose={() => setCropOpen(null)}
          onSave={(url) => {
            setDraft((d) => ({
              ...d,
              media: (d.media ?? []).map((m) => (m.id === cropOpen.id ? { ...m, url } : m)),
              image:
                (d.media ?? []).findIndex((m) => m.id === cropOpen.id) === 0 ? url : d.image,
            }));
            setCropOpen(null);
          }}
        />
      )}
    </div>
  );
}

function CategoryChip({
  cat,
  selected,
  isPrimary,
  onToggle,
  onMakePrimary,
}: {
  cat: string;
  selected: boolean;
  isPrimary: boolean;
  onToggle: () => void;
  onMakePrimary: () => void;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const startLong = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onMakePrimary();
    }, 420);
  };
  const cancelLong = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const handleClick = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onToggle();
  };

  return (
    <button
      onMouseDown={startLong}
      onMouseUp={cancelLong}
      onMouseLeave={cancelLong}
      onTouchStart={startLong}
      onTouchEnd={cancelLong}
      onClick={handleClick}
      className={`px-2.5 py-1.5 rounded-full text-[11px] font-display font-bold border-2 transition flex items-center gap-1 ${
        selected
          ? "text-[color:oklch(0.18_0.06_18)] border-[#d4af37] shadow-sm"
          : "text-[color:oklch(0.55_0.10_82)] border-[color:oklch(0.78_0.14_82/0.3)] bg-white"
      }`}
      style={
        selected
          ? { background: "linear-gradient(180deg, #fff3c8, #f5d97a)" }
          : undefined
      }
    >
      {isPrimary && <StarIcon className="h-2.5 w-2.5 fill-[#8b6508] text-[#8b6508]" />}
      {cat}
      {selected && !isPrimary && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="mt-1 w-full rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] px-3 py-2 text-sm outline-none focus:border-[#d4af37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.2)] transition"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type ?? "text"}
          inputMode={type === "number" ? "numeric" : undefined}
          className="mt-1 w-full rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] px-3 py-2 text-sm outline-none focus:border-[#d4af37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.2)] transition"
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[color:oklch(0.45_0.08_85)]">{label}</span>
      <span className="font-bold text-[color:oklch(0.25_0.05_85)]">{value}</span>
    </div>
  );
}

// ============== CROP OVERLAY ==============

function CropOverlay({
  item,
  onClose,
  onSave,
}: {
  item: MediaItem;
  onClose: () => void;
  onSave: (url: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const FRAME = 280;

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPan({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y });
  };
  const onPointerUp = () => {
    dragging.current = null;
  };

  const applyCrop = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = FRAME;
      canvas.height = FRAME;
      const ctx = canvas.getContext("2d");
      if (!ctx) return onSave(item.url);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, FRAME, FRAME);
      ctx.translate(FRAME / 2 + pan.x, FRAME / 2 + pan.y);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      const ratio = Math.min(FRAME / img.width, FRAME / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      onSave(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => onSave(item.url);
    img.src = item.url;
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 backdrop-blur-md">
      <div
        className="relative w-[92%] max-w-sm rounded-3xl p-4"
        style={{ background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 100%)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">
              ✦ Adjust ✦
            </p>
            <h4 className="font-display text-base text-gold-gradient font-bold">Crop & Zoom</h4>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="mx-auto rounded-2xl overflow-hidden bg-[color:oklch(0.95_0.02_85)] relative cursor-grab active:cursor-grabbing touch-none"
          style={{ width: FRAME, height: FRAME }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <img
            src={item.url}
            alt=""
            draggable={false}
            className="absolute top-1/2 left-1/2 max-w-none select-none pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotate}deg) scale(${zoom})`,
              transformOrigin: "center",
              transition: dragging.current ? "none" : "transform 0.1s",
              width: FRAME,
              height: "auto",
            }}
          />
          {/* Frame guide */}
          <div className="absolute inset-2 border-2 border-white/80 rounded-xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
        </div>

        {/* Controls */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <ZoomOut className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#d4af37]"
            />
            <ZoomIn className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setRotate((r) => r + 90)}
              className="px-3 py-1.5 rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] text-[11px] font-bold text-[color:oklch(0.42_0.10_82)] flex items-center gap-1 active:scale-95"
            >
              <RotateCw className="h-3 w-3" /> Rotate
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setRotate(0);
                setPan({ x: 0, y: 0 });
              }}
              className="text-[10px] font-bold text-[color:oklch(0.55_0.10_82)] underline"
            >
              Reset
            </button>
          </div>
          <button
            onClick={applyCrop}
            className="btn-3d w-full py-2.5 rounded-xl font-display font-bold text-sm text-[color:oklch(0.18_0.06_18)]"
            style={{
              background: "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37)",
            }}
          >
            <Check className="inline h-4 w-4 mr-1" strokeWidth={3} /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}

// ================== SHEET TRIGGER ROW ==================

function SheetTriggerRow({
  icon,
  title,
  hint,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl bg-white/85 border border-[color:oklch(0.78_0.14_82/0.5)] p-3 text-left active:scale-[0.99] transition shadow-sm"
    >
      <span
        className="h-9 w-9 rounded-xl grid place-items-center text-[color:oklch(0.18_0.06_18)] shadow-sm flex-shrink-0"
        style={{ background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)" }}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[color:oklch(0.55_0.10_82)] font-bold">
            {title}
          </span>
          {hint && (
            <span className="text-[9px] italic text-[color:oklch(0.55_0.10_82)]">· {hint}</span>
          )}
        </span>
        <span className="block mt-0.5 text-xs font-display font-bold text-[color:oklch(0.30_0.05_85)] truncate">
          {value}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-[color:oklch(0.55_0.10_82)] flex-shrink-0" />
    </button>
  );
}

// ================== BOTTOM SHEET SHELL ==================

function BottomSheetShell({
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.85_0.03_85/0.55)] backdrop-blur-md"
        style={{ animation: "overlay-in 0.25s ease-out" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[88vh] flex flex-col"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #fffdf5 35%, #fbf3d9 100%)",
          boxShadow: "0 -20px 60px -12px rgba(212,175,55,0.45)",
          animation: "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="pt-3 pb-1 grid place-items-center">
          <span className="block h-1.5 w-14 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f5d97a] to-[#d4af37]" />
        </div>
        <div className="px-5 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:oklch(0.55_0.10_82)]">✦ Picker ✦</p>
            <h3 className="font-display text-lg text-gold-gradient font-bold">{title}</h3>
            {subtitle && (
              <p className="text-[10px] text-[color:oklch(0.45_0.08_85)]">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
          >
            <X className="h-4 w-4 text-[color:oklch(0.30_0.05_85)]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">{children}</div>
        {footer && (
          <div className="px-5 pt-2 pb-3 border-t border-[color:oklch(0.78_0.14_82/0.3)]">{footer}</div>
        )}
      </div>
    </div>
  );
}

// ================== CATEGORY BOTTOM SHEET ==================

function CategoryBottomSheet({
  tags,
  primary,
  customCat,
  setCustomCat,
  onClose,
  onChange,
}: {
  tags: string[];
  primary: string;
  customCat: string;
  setCustomCat: (v: string) => void;
  onClose: () => void;
  onChange: (tags: string[], primary: string) => void;
}) {
  const toggle = (cat: string) => {
    const next = tags.includes(cat) ? tags.filter((t) => t !== cat) : [...tags, cat];
    let p = primary;
    if (!next.includes(p)) p = next[0] ?? "";
    onChange(next, p);
  };
  const makePrimary = (cat: string) => {
    const next = Array.from(new Set([...tags, cat]));
    onChange(next, cat);
  };
  const addCustom = () => {
    const tag = customCat.trim();
    if (!tag) return;
    const next = Array.from(new Set([...tags, tag]));
    onChange(next, primary || tag);
    setCustomCat("");
  };

  return (
    <BottomSheetShell
      title="Map to categories"
      subtitle="Helps customers find this product in the right section."
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="btn-3d w-full py-3 rounded-2xl font-display font-bold text-sm text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
          style={{ background: "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37)" }}
        >
          <Check className="inline h-4 w-4 mr-1" strokeWidth={3} /> Done
        </button>
      }
    >
      <p className="text-[10px] text-[color:oklch(0.45_0.08_85)] leading-snug">
        Tap to map ·{" "}
        <StarIcon className="inline h-2.5 w-2.5 fill-[#d4af37] text-[#d4af37] mx-0.5" /> long-press
        for primary.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from(new Set([...SHOP_CATEGORIES, ...tags])).map((cat) => (
          <CategoryChip
            key={cat}
            cat={cat}
            selected={tags.includes(cat)}
            isPrimary={primary === cat}
            onToggle={() => toggle(cat)}
            onMakePrimary={() => makePrimary(cat)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input
          value={customCat}
          onChange={(e) => setCustomCat(e.target.value)}
          placeholder="+ Add custom category"
          className="flex-1 rounded-lg bg-white border border-[color:oklch(0.78_0.14_82/0.5)] px-2.5 py-1.5 text-xs outline-none focus:border-[#d4af37]"
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
        />
        <button
          onClick={addCustom}
          className="px-3 py-1.5 rounded-lg text-xs font-display font-bold text-[color:oklch(0.18_0.06_18)] active:scale-95"
          style={{ background: "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37)" }}
        >
          <Plus className="inline h-3 w-3 mr-0.5" strokeWidth={3} /> Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="rounded-xl bg-gradient-to-b from-[#fff8dc] to-white border border-[color:oklch(0.78_0.14_82/0.4)] p-2 text-[11px] text-[color:oklch(0.42_0.10_82)]">
          <span className="font-bold">Mapped:</span> {tags.join(" · ")}
          {primary && (
            <>
              {" · "}
              <span className="font-bold text-[color:oklch(0.30_0.05_85)]">Primary: {primary}</span>
            </>
          )}
        </div>
      )}
    </BottomSheetShell>
  );
}

// ================== VARIATION BOTTOM SHEET ==================

const COLOR_PRESETS = [
  { name: "Red", hex: "#dc2626" },
  { name: "Black", hex: "#111827" },
  { name: "White", hex: "#f8fafc" },
  { name: "Gold", hex: "#d4af37" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Green", hex: "#16a34a" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Beige", hex: "#d6c2a4" },
];

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "Free"];

function VariationBottomSheet({
  variations,
  defaultPrice,
  onClose,
  onChange,
}: {
  variations: Variation[];
  defaultPrice: number;
  onClose: () => void;
  onChange: (list: Variation[]) => void;
}) {
  const update = (id: string, patch: Partial<Variation>) =>
    onChange(variations.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const remove = (id: string) => onChange(variations.filter((v) => v.id !== id));
  const add = () =>
    onChange([
      ...variations,
      { id: `v-${Date.now()}`, label: "", price: defaultPrice, size: "", color: "" },
    ]);

  return (
    <BottomSheetShell
      title="Attributes & Variations"
      subtitle="Add image, size and color for each variation."
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="btn-3d w-full py-3 rounded-2xl font-display font-bold text-sm text-[color:oklch(0.18_0.06_18)] shadow-gold-glow"
          style={{ background: "linear-gradient(180deg, #fff3c8, #f5d97a, #d4af37)" }}
        >
          <Check className="inline h-4 w-4 mr-1" strokeWidth={3} /> Done
        </button>
      }
    >
      {variations.length === 0 && (
        <p className="text-[12px] text-center py-3 italic text-[color:oklch(0.55_0.10_82)]">
          No variations yet · tap "Add Variation" below.
        </p>
      )}

      {variations.map((v) => (
        <VariationRow
          key={v.id}
          v={v}
          onChange={(patch) => update(v.id, patch)}
          onRemove={() => remove(v.id)}
        />
      ))}

      <button
        onClick={add}
        className="w-full py-2.5 rounded-2xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.55)] flex items-center justify-center gap-1 text-[12px] font-display font-bold text-[color:oklch(0.42_0.10_82)] bg-white/70 active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" strokeWidth={3} /> Add Variation
      </button>
    </BottomSheetShell>
  );
}

function VariationRow({
  v,
  onChange,
  onRemove,
}: {
  v: Variation;
  onChange: (patch: Partial<Variation>) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange({ image: String(r.result) });
    r.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div className="rounded-2xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] p-2.5 space-y-2">
      <div className="flex items-start gap-2">
        {/* Image */}
        <button
          onClick={() => fileRef.current?.click()}
          className="h-16 w-16 flex-shrink-0 rounded-xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center bg-[color:oklch(0.97_0.02_85)] overflow-hidden"
        >
          {v.image ? (
            <img src={v.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-[color:oklch(0.55_0.10_82)]">
              <ImageIcon className="h-4 w-4" />
              <span className="text-[8px] font-bold">Add Pic</span>
            </div>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            value={v.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Label · e.g. Red XL"
            className="w-full rounded-lg bg-white border border-[color:oklch(0.78_0.14_82/0.5)] px-2 py-1.5 text-xs font-bold outline-none focus:border-[#d4af37]"
          />
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[color:oklch(0.55_0.10_82)]">₹</span>
              <input
                value={v.price || ""}
                onChange={(e) => onChange({ price: Number(e.target.value) || 0 })}
                type="number"
                placeholder="0"
                className="w-full rounded-lg bg-white border border-[color:oklch(0.78_0.14_82/0.5)] pl-5 pr-2 py-1.5 text-xs font-bold text-right outline-none focus:border-[#d4af37]"
              />
            </div>
            <button
              onClick={onRemove}
              className="h-7 w-7 grid place-items-center rounded-full bg-rose-50 text-rose-500 active:scale-90 flex-shrink-0"
              aria-label="Remove variation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Size presets */}
      <div>
        <p className="text-[9px] uppercase tracking-wider text-[color:oklch(0.55_0.10_82)] font-bold mb-1">
          Size
        </p>
        <div className="flex flex-wrap gap-1">
          {SIZE_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ size: v.size === s ? "" : s })}
              className={`px-2 py-1 rounded-full text-[10px] font-bold border transition ${
                v.size === s
                  ? "border-[#d4af37] text-[color:oklch(0.18_0.06_18)] bg-gradient-to-b from-[#fff3c8] to-[#f5d97a]"
                  : "border-[color:oklch(0.78_0.14_82/0.4)] text-[color:oklch(0.55_0.10_82)] bg-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Color presets */}
      <div>
        <p className="text-[9px] uppercase tracking-wider text-[color:oklch(0.55_0.10_82)] font-bold mb-1">
          Color
        </p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.hex}
              onClick={() => onChange({ color: v.color === c.hex ? "" : c.hex })}
              aria-label={c.name}
              className={`h-6 w-6 rounded-full border-2 transition ${
                v.color === c.hex ? "border-[#d4af37] scale-110 shadow" : "border-white shadow-sm"
              }`}
              style={{ background: c.hex }}
            />
          ))}
          <input
            value={v.color ?? ""}
            onChange={(e) => onChange({ color: e.target.value })}
            placeholder="#hex"
            className="w-20 rounded-lg bg-white border border-[color:oklch(0.78_0.14_82/0.4)] px-2 py-1 text-[10px] outline-none focus:border-[#d4af37]"
          />
        </div>
      </div>
    </div>
  );
}
