import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronDown,
  Loader2,
  FolderTree,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminLayout,
  GoldCard,
  GoldButton,
  PageHeader,
} from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({
    meta: [
      { title: "Categories — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CategoriesPage,
});

type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .order("name");
    setItems((data ?? []) as Category[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const roots = items.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => items.filter((c) => c.parent_id === id);

  const toggle = (id: string) => {
    const n = new Set(expanded);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setExpanded(n);
  };

  const startNew = (parent_id: string | null = null) => {
    setEditing({
      name: "",
      slug: "",
      description: "",
      is_active: true,
      sort_order: 0,
      parent_id,
    });
  };

  const save = async () => {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      slug: editing.slug?.trim() || slugify(editing.name),
      description: editing.description ?? null,
      is_active: editing.is_active ?? true,
      sort_order: editing.sort_order ?? 0,
      parent_id: editing.parent_id ?? null,
    };
    if (editing.id) {
      await supabase.from("categories").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("categories").insert(payload);
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Yeh category aur iski sub-categories delete ho jaayengi. Sure?")) return;
    await supabase.from("categories").delete().eq("id", id);
    load();
  };

  const renderNode = (c: Category, depth = 0) => {
    const kids = childrenOf(c.id);
    const isOpen = expanded.has(c.id);
    return (
      <div key={c.id}>
        <div
          className="flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-[#d4af37]/5 group"
          style={{ paddingLeft: `${12 + depth * 18}px` }}
        >
          {kids.length > 0 ? (
            <button
              onClick={() => toggle(c.id)}
              className="p-0.5 rounded text-[#d4af37]"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <FolderTree className="h-4 w-4 text-[#d4af37]/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#fff8dc] truncate font-medium">
                {c.name}
              </span>
              {!c.is_active && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[#d4af37]/30 text-[#d4af37]/70">
                  Inactive
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#d4af37]/50">{c.slug}</span>
          </div>
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
            <button
              onClick={() => startNew(c.id)}
              title="Add sub-category"
              className="p-1.5 rounded-lg text-[#f5d97a] hover:bg-[#d4af37]/10"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setEditing(c)}
              title="Edit"
              className="p-1.5 rounded-lg text-[#f5d97a] hover:bg-[#d4af37]/10"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => remove(c.id)}
              title="Delete"
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {isOpen && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Categories"
        subtitle="Tree structure — add categories aur sub-categories"
        action={
          <GoldButton onClick={() => startNew(null)}>
            <Plus className="h-3.5 w-3.5 inline mr-1" /> Add Category
          </GoldButton>
        }
      />

      <GoldCard className="p-3 sm:p-4">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
          </div>
        ) : roots.length === 0 ? (
          <div className="text-center py-16">
            <FolderTree className="h-10 w-10 text-[#d4af37]/40 mx-auto mb-3" />
            <p className="text-sm text-[#f5d97a]/60">
              Abhi koi category nahi hai. Pehli category add kariye.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#d4af37]/10">
            {roots.map((r) => renderNode(r))}
          </div>
        )}
      </GoldCard>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !saving && setEditing(null)}
          />
          <div
            className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border p-6"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.16 0.03 80) 0%, oklch(0.10 0.02 80) 100%)",
              borderColor: "rgba(212,175,55,0.4)",
              boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-display text-lg font-bold"
                style={{
                  background: "linear-gradient(180deg, #fff8dc, #d4af37)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {editing.id ? "Edit Category" : "New Category"}
              </h3>
              <button
                onClick={() => !saving && setEditing(null)}
                className="p-1.5 rounded-lg text-[#f5d97a] hover:bg-[#d4af37]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Name">
                <input
                  value={editing.name ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      name: e.target.value,
                      slug:
                        editing.id || editing.slug
                          ? editing.slug
                          : slugify(e.target.value),
                    })
                  }
                  className={inputCls}
                  placeholder="e.g. Electronics"
                />
              </Field>
              <Field label="Slug">
                <input
                  value={editing.slug ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, slug: e.target.value })
                  }
                  className={inputCls}
                  placeholder="electronics"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={editing.description ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  className={`${inputCls} min-h-20 resize-y`}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort order">
                  <input
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        sort_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={editing.is_active ? "1" : "0"}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        is_active: e.target.value === "1",
                      })
                    }
                    className={inputCls}
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <GoldButton
                variant="outline"
                onClick={() => setEditing(null)}
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
