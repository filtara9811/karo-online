import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  Loader2,
  X,
  Tag,
  FolderTree,
  Layers,
  Package,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminLayout,
  GoldCard,
  GoldButton,
  PageHeader,
} from "@/components/admin/AdminLayout";
import { ImageUpload, IconImage } from "@/components/admin/ImageUpload";

export const Route = createFileRoute("/admin/catalog")({
  head: () => ({
    meta: [
      { title: "Catalog — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CatalogPage,
});

// ---------- Types ----------
type CatalogType = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};
type Category = {
  id: string;
  type_id: string | null;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  lead_price_inr?: number | null;
  max_vendors_per_lead?: number | null;
};
type Item = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  price_min: number | null;
  price_max: number | null;
  sort_order: number;
  is_active: boolean;
};
type Variation = {
  id: string;
  item_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_min: number | null;
  price_max: number | null;
  sort_order: number;
  is_active: boolean;
};

type Crumb =
  | { level: "type"; node: CatalogType }
  | { level: "category"; node: Category }
  | { level: "subcategory"; node: Category }
  | { level: "item"; node: Item };

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const inputCls =
  "w-full px-3 py-2.5 rounded-xl bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] placeholder:text-[#f5d97a]/30 outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 text-sm";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function CatalogPage() {
  const [types, setTypes] = useState<CatalogType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);

  const [editor, setEditor] = useState<
    | null
    | { kind: "type"; data: Partial<CatalogType> }
    | { kind: "category"; data: Partial<Category> }
    | { kind: "subcategory"; data: Partial<Category> }
    | { kind: "item"; data: Partial<Item> }
    | { kind: "variation"; data: Partial<Variation> }
  >(null);
  const [saving, setSaving] = useState(false);

  const reloadAll = async () => {
    setLoading(true);
    const [t, c, i, v] = await Promise.all([
      supabase.from("catalog_types").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order").order("name"),
      supabase.from("catalog_items").select("*").order("sort_order").order("name"),
      supabase.from("item_variations").select("*").order("sort_order").order("name"),
    ]);
    setTypes((t.data ?? []) as CatalogType[]);
    setCategories((c.data ?? []) as Category[]);
    setItems((i.data ?? []) as Item[]);
    setVariations((v.data ?? []) as Variation[]);
    setLoading(false);
  };

  useEffect(() => {
    reloadAll();
  }, []);

  // Derive current view from crumbs
  const view = useMemo(() => {
    const last = crumbs[crumbs.length - 1];
    if (!last) return { level: "types" as const };
    if (last.level === "type")
      return { level: "categories" as const, type: last.node };
    if (last.level === "category")
      return {
        level: "subcategories" as const,
        type: (crumbs[0] as any).node as CatalogType,
        category: last.node,
      };
    if (last.level === "subcategory")
      return {
        level: "items" as const,
        type: (crumbs[0] as any).node as CatalogType,
        category: (crumbs[1] as any).node as Category,
        subcategory: last.node,
      };
    return {
      level: "variations" as const,
      type: (crumbs[0] as any).node as CatalogType,
      category: (crumbs[1] as any).node as Category,
      subcategory: (crumbs[2] as any).node as Category,
      item: last.node,
    };
  }, [crumbs]);

  // Filtered children
  const visibleCategories = useMemo(() => {
    if (view.level !== "categories") return [];
    return categories.filter(
      (c) => c.type_id === view.type.id && !c.parent_id,
    );
  }, [view, categories]);

  const visibleSubcategories = useMemo(() => {
    if (view.level !== "subcategories") return [];
    return categories.filter((c) => c.parent_id === view.category.id);
  }, [view, categories]);

  const visibleItems = useMemo(() => {
    if (view.level !== "items") return [];
    return items.filter((it) => it.category_id === view.subcategory.id);
  }, [view, items]);

  const visibleVariations = useMemo(() => {
    if (view.level !== "variations") return [];
    return variations.filter((v) => v.item_id === view.item.id);
  }, [view, variations]);

  // ------ Save & Delete ------
  const save = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      if (editor.kind === "type") {
        const d = editor.data;
        const payload = {
          code: d.code?.trim() || slugify(d.name || ""),
          name: d.name!.trim(),
          icon: d.icon || null,
          sort_order: d.sort_order ?? 0,
          is_active: d.is_active ?? true,
        };
        if (d.id) await supabase.from("catalog_types").update(payload).eq("id", d.id);
        else await supabase.from("catalog_types").insert(payload);
      } else if (editor.kind === "category" || editor.kind === "subcategory") {
        const d = editor.data;
        const payload: any = {
          name: d.name!.trim(),
          slug: d.slug?.trim() || slugify(d.name || ""),
          description: d.description ?? null,
          icon: d.icon ?? null,
          image_url: d.image_url ?? null,
          is_active: d.is_active ?? true,
          sort_order: d.sort_order ?? 0,
          type_id: d.type_id ?? null,
          parent_id: d.parent_id ?? null,
        };
        if (editor.kind === "subcategory") {
          payload.lead_price_inr = d.lead_price_inr === "" || d.lead_price_inr == null ? null : Number(d.lead_price_inr);
          payload.max_vendors_per_lead = d.max_vendors_per_lead === "" || d.max_vendors_per_lead == null ? null : Number(d.max_vendors_per_lead);
        }
        if (d.id) await supabase.from("categories").update(payload).eq("id", d.id);
        else await supabase.from("categories").insert(payload);
      } else if (editor.kind === "item") {
        const d = editor.data;
        const payload = {
          category_id: d.category_id!,
          name: d.name!.trim(),
          slug: d.slug?.trim() || slugify(d.name || ""),
          description: d.description ?? null,
          icon: d.icon ?? null,
          image_url: d.image_url ?? null,
          price_min: d.price_min ?? null,
          price_max: d.price_max ?? null,
          sort_order: d.sort_order ?? 0,
          is_active: d.is_active ?? true,
        };
        if (d.id) await supabase.from("catalog_items").update(payload).eq("id", d.id);
        else await supabase.from("catalog_items").insert(payload);
      } else if (editor.kind === "variation") {
        const d = editor.data;
        const payload = {
          item_id: d.item_id!,
          name: d.name!.trim(),
          description: d.description ?? null,
          image_url: d.image_url ?? null,
          price_min: d.price_min ?? null,
          price_max: d.price_max ?? null,
          sort_order: d.sort_order ?? 0,
          is_active: d.is_active ?? true,
        };
        if (d.id) await supabase.from("item_variations").update(payload).eq("id", d.id);
        else await supabase.from("item_variations").insert(payload);
      }
      setEditor(null);
      await reloadAll();
    } catch (e: any) {
      alert("Save failed: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (
    table: "catalog_types" | "categories" | "catalog_items" | "item_variations",
    id: string,
  ) => {
    if (!confirm("Delete kar dein? Iske andar ki sabhi entries bhi delete ho jayengi.")) return;
    await supabase.from(table).delete().eq("id", id);
    await reloadAll();
  };

  // ------ Renderers ------
  const Header = () => (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <button
        onClick={() => setCrumbs([])}
        className="text-xs text-[#f5d97a]/60 hover:text-[#fff8dc] uppercase tracking-widest font-bold"
      >
        Catalog
      </button>
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-2">
          <ChevronRight className="h-3 w-3 text-[#d4af37]/50" />
          <button
            onClick={() => setCrumbs(crumbs.slice(0, i + 1))}
            className="text-xs text-[#f5d97a]/80 hover:text-[#fff8dc] truncate max-w-[140px]"
          >
            {(c.node as any).name}
          </button>
        </span>
      ))}
      {crumbs.length > 0 && (
        <button
          onClick={() => setCrumbs(crumbs.slice(0, -1))}
          className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#d4af37] hover:text-[#fff8dc]"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
      )}
    </div>
  );

  const Card = ({
    title,
    subtitle,
    icon,
    image,
    inactive,
    onOpen,
    onEdit,
    onDelete,
    badge,
  }: {
    title: string;
    subtitle?: string;
    icon?: string | null;
    image?: string | null;
    inactive?: boolean;
    onOpen?: () => void;
    onEdit: () => void;
    onDelete: () => void;
    badge?: string;
  }) => (
    <div
      className="group rounded-2xl border p-3 sm:p-4 flex items-center gap-3 hover:border-[#d4af37]/60 transition cursor-pointer"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,253,245,0.05), rgba(255,253,245,0.02))",
        borderColor: "rgba(212,175,55,0.25)",
      }}
      onClick={onOpen}
    >
      <IconImage url={image} icon={icon} size={48} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[#fff8dc] truncate">
            {title}
          </p>
          {inactive && (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[#d4af37]/30 text-[#d4af37]/70">
              Off
            </span>
          )}
          {badge && (
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
              style={{
                background: "linear-gradient(180deg, #f5d97a, #d4af37)",
                color: "#1a1208",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-[#f5d97a]/55 truncate mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      <div
        className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-[#f5d97a] hover:bg-[#d4af37]/10"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        {onOpen && (
          <ChevronRight className="h-4 w-4 text-[#d4af37]/60 ml-1" />
        )}
      </div>
    </div>
  );

  const Empty = ({ icon: Icon, msg }: { icon: any; msg: string }) => (
    <div className="text-center py-16">
      <Icon className="h-10 w-10 text-[#d4af37]/40 mx-auto mb-3" />
      <p className="text-sm text-[#f5d97a]/60">{msg}</p>
    </div>
  );

  // ---------- Add buttons per level ----------
  const addButton = () => {
    if (view.level === "types")
      return (
        <GoldButton
          onClick={() =>
            setEditor({
              kind: "type",
              data: { name: "", code: "", icon: "", sort_order: 0, is_active: true },
            })
          }
        >
          <Plus className="h-3.5 w-3.5 inline mr-1" /> Add Type
        </GoldButton>
      );
    if (view.level === "categories")
      return (
        <GoldButton
          onClick={() =>
            setEditor({
              kind: "category",
              data: {
                name: "",
                slug: "",
                is_active: true,
                sort_order: 0,
                type_id: view.type.id,
                parent_id: null,
              },
            })
          }
        >
          <Plus className="h-3.5 w-3.5 inline mr-1" /> Add Category
        </GoldButton>
      );
    if (view.level === "subcategories")
      return (
        <GoldButton
          onClick={() =>
            setEditor({
              kind: "subcategory",
              data: {
                name: "",
                slug: "",
                is_active: true,
                sort_order: 0,
                type_id: view.category.type_id,
                parent_id: view.category.id,
              },
            })
          }
        >
          <Plus className="h-3.5 w-3.5 inline mr-1" /> Add Sub-category
        </GoldButton>
      );
    if (view.level === "items")
      return (
        <GoldButton
          onClick={() =>
            setEditor({
              kind: "item",
              data: {
                name: "",
                slug: "",
                is_active: true,
                sort_order: 0,
                category_id: view.subcategory.id,
              },
            })
          }
        >
          <Plus className="h-3.5 w-3.5 inline mr-1" /> Add Item
        </GoldButton>
      );
    return (
      <GoldButton
        onClick={() =>
          setEditor({
            kind: "variation",
            data: {
              name: "",
              is_active: true,
              sort_order: 0,
              item_id: view.item.id,
            },
          })
        }
      >
        <Plus className="h-3.5 w-3.5 inline mr-1" /> Add Variation
      </GoldButton>
    );
  };

  const subtitle = () => {
    if (view.level === "types") return "Top level — Product, Service, Other";
    if (view.level === "categories")
      return `Categories under ${view.type.name}`;
    if (view.level === "subcategories")
      return `Sub-categories under ${view.category.name}`;
    if (view.level === "items")
      return `Items under ${view.subcategory.name}`;
    return `Variations of ${view.item.name}`;
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Catalog Manager"
        subtitle={subtitle()}
        action={addButton()}
      />
      <Header />

      <GoldCard className="p-3 sm:p-4">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
          </div>
        ) : view.level === "types" ? (
          types.length === 0 ? (
            <Empty icon={Tag} msg="Koi type nahi. Pehle ek type add kariye." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {types.map((t) => (
                <Card
                  key={t.id}
                  title={t.name}
                  subtitle={t.code}
                  icon={t.icon}
                  inactive={!t.is_active}
                  onOpen={() => setCrumbs([{ level: "type", node: t }])}
                  onEdit={() => setEditor({ kind: "type", data: t })}
                  onDelete={() => remove("catalog_types", t.id)}
                  badge={
                    categories.filter((c) => c.type_id === t.id && !c.parent_id)
                      .length + " cats"
                  }
                />
              ))}
            </div>
          )
        ) : view.level === "categories" ? (
          visibleCategories.length === 0 ? (
            <Empty icon={FolderTree} msg="Is type me categories add kariye." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {visibleCategories.map((c) => (
                <Card
                  key={c.id}
                  title={c.name}
                  subtitle={c.slug}
                  icon={c.icon}
                  image={c.image_url}
                  inactive={!c.is_active}
                  onOpen={() =>
                    setCrumbs([...crumbs, { level: "category", node: c }])
                  }
                  onEdit={() => setEditor({ kind: "category", data: c })}
                  onDelete={() => remove("categories", c.id)}
                  badge={
                    categories.filter((s) => s.parent_id === c.id).length +
                    " sub"
                  }
                />
              ))}
            </div>
          )
        ) : view.level === "subcategories" ? (
          visibleSubcategories.length === 0 ? (
            <Empty icon={Layers} msg="Sub-categories add kariye (e.g. Carpenter, Plumber)." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {visibleSubcategories.map((c) => (
                <Card
                  key={c.id}
                  title={c.name}
                  subtitle={c.slug}
                  icon={c.icon}
                  image={c.image_url}
                  inactive={!c.is_active}
                  onOpen={() =>
                    setCrumbs([...crumbs, { level: "subcategory", node: c }])
                  }
                  onEdit={() => setEditor({ kind: "subcategory", data: c })}
                  onDelete={() => remove("categories", c.id)}
                  badge={
                    items.filter((it) => it.category_id === c.id).length +
                    " items"
                  }
                />
              ))}
            </div>
          )
        ) : view.level === "items" ? (
          visibleItems.length === 0 ? (
            <Empty icon={Package} msg="Items add kariye (e.g. AC Service)." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {visibleItems.map((it) => (
                <Card
                  key={it.id}
                  title={it.name}
                  subtitle={
                    it.price_min || it.price_max
                      ? `₹${it.price_min ?? "?"} – ${it.price_max ?? "?"}`
                      : it.slug
                  }
                  icon={it.icon}
                  image={it.image_url}
                  inactive={!it.is_active}
                  onOpen={() =>
                    setCrumbs([...crumbs, { level: "item", node: it }])
                  }
                  onEdit={() => setEditor({ kind: "item", data: it })}
                  onDelete={() => remove("catalog_items", it.id)}
                  badge={
                    variations.filter((v) => v.item_id === it.id).length +
                    " var"
                  }
                />
              ))}
            </div>
          )
        ) : visibleVariations.length === 0 ? (
          <Empty icon={Sparkles} msg="Variations add kariye (e.g. AC Repair, Gas Refill)." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {visibleVariations.map((v) => (
              <Card
                key={v.id}
                title={v.name}
                subtitle={
                  v.price_min || v.price_max
                    ? `₹${v.price_min ?? "?"} – ${v.price_max ?? "?"}`
                    : v.description ?? ""
                }
                image={v.image_url}
                inactive={!v.is_active}
                onEdit={() => setEditor({ kind: "variation", data: v })}
                onDelete={() => remove("item_variations", v.id)}
              />
            ))}
          </div>
        )}
      </GoldCard>

      {/* ===== Editor modal ===== */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !saving && setEditor(null)}
          />
          <div
            className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border p-6"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.16 0.03 80) 0%, oklch(0.10 0.02 80) 100%)",
              borderColor: "rgba(212,175,55,0.4)",
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)",
            }}
          >
            <div className="flex items-center justify-between mb-4 sticky top-0">
              <h3
                className="font-display text-lg font-bold capitalize"
                style={{
                  background: "linear-gradient(180deg, #fff8dc, #d4af37)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {(editor.data as any).id ? "Edit" : "New"} {editor.kind}
              </h3>
              <button
                onClick={() => !saving && setEditor(null)}
                className="p-1.5 rounded-lg text-[#f5d97a] hover:bg-[#d4af37]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <EditorForm editor={editor} setEditor={setEditor} />

            <div className="flex gap-2 mt-6">
              <GoldButton
                variant="outline"
                onClick={() => setEditor(null)}
                className="flex-1"
              >
                Cancel
              </GoldButton>
              <GoldButton onClick={save} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Save"}
              </GoldButton>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function EditorForm({
  editor,
  setEditor,
}: {
  editor: any;
  setEditor: (e: any) => void;
}) {
  const d = editor.data;
  const update = (patch: any) =>
    setEditor({ ...editor, data: { ...d, ...patch } });

  const showImage = editor.kind !== "type";
  const showSlug = editor.kind !== "type" && editor.kind !== "variation";
  const showPrice = editor.kind === "item" || editor.kind === "variation";
  const showIconEmoji =
    editor.kind === "type" ||
    editor.kind === "category" ||
    editor.kind === "subcategory" ||
    editor.kind === "item";

  return (
    <div className="space-y-3">
      <Field label="Name">
        <input
          value={d.name ?? ""}
          onChange={(e) =>
            update({
              name: e.target.value,
              ...(showSlug && !d.id && !d.slug
                ? { slug: slugify(e.target.value) }
                : {}),
            })
          }
          className={inputCls}
          placeholder={
            editor.kind === "type"
              ? "e.g. Service"
              : editor.kind === "item"
              ? "e.g. AC Service"
              : "Name"
          }
        />
      </Field>

      {editor.kind === "type" && (
        <Field label="Code (unique)">
          <input
            value={d.code ?? ""}
            onChange={(e) => update({ code: e.target.value })}
            className={inputCls}
            placeholder="service"
          />
        </Field>
      )}

      {showSlug && (
        <Field label="Slug">
          <input
            value={d.slug ?? ""}
            onChange={(e) => update({ slug: e.target.value })}
            className={inputCls}
          />
        </Field>
      )}

      {showIconEmoji && (
        <Field label="Icon (emoji)">
          <input
            value={d.icon ?? ""}
            onChange={(e) => update({ icon: e.target.value })}
            className={inputCls}
            placeholder="🛠️"
            maxLength={4}
          />
        </Field>
      )}

      {showImage && (
        <ImageUpload
          value={d.image_url}
          onChange={(url) => update({ image_url: url })}
          label="Image"
          folder={editor.kind}
        />
      )}

      {(editor.kind === "category" ||
        editor.kind === "subcategory" ||
        editor.kind === "item" ||
        editor.kind === "variation") && (
        <Field label="Description">
          <textarea
            value={d.description ?? ""}
            onChange={(e) => update({ description: e.target.value })}
            className={`${inputCls} min-h-16 resize-y`}
          />
        </Field>
      )}

      {showPrice && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price min (₹)">
            <input
              type="number"
              value={d.price_min ?? ""}
              onChange={(e) =>
                update({
                  price_min:
                    e.target.value === "" ? null : parseFloat(e.target.value),
                })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Price max (₹)">
            <input
              type="number"
              value={d.price_max ?? ""}
              onChange={(e) =>
                update({
                  price_max:
                    e.target.value === "" ? null : parseFloat(e.target.value),
                })
              }
              className={inputCls}
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort order">
          <input
            type="number"
            value={d.sort_order ?? 0}
            onChange={(e) =>
              update({ sort_order: parseInt(e.target.value) || 0 })
            }
            className={inputCls}
          />
        </Field>
        <Field label="Status">
          <select
            value={d.is_active === false ? "0" : "1"}
            onChange={(e) => update({ is_active: e.target.value === "1" })}
            className={inputCls}
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </Field>
      </div>
    </div>
  );
}
