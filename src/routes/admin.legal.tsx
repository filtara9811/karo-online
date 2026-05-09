import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, Eye, EyeOff, FileText, Image as ImageIcon, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminLayout, PageHeader, GoldButton, GoldCard } from "@/components/admin/AdminLayout";

type Page = {
  id: string;
  slug: string;
  title: string;
  body: string;
  hero_image_url: string | null;
  video_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export const Route = createFileRoute("/admin/legal")({
  component: () => (
    <AdminLayout>
      <LegalAdminPage />
    </AdminLayout>
  ),
});

function LegalAdminPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("legal_pages")
      .select("*")
      .order("sort_order");
    setPages((data as Page[]) ?? []);
    if (!activeId && data && data.length > 0) setActiveId(data[0].id);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = pages.find((p) => p.id === activeId);

  const update = async (patch: Partial<Page>) => {
    if (!active) return;
    setPages((prev) => prev.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));
  };

  const save = async () => {
    if (!active) return;
    const { error } = await supabase
      .from("legal_pages")
      .update({
        title: active.title,
        body: active.body,
        hero_image_url: active.hero_image_url || null,
        video_url: active.video_url || null,
        is_active: active.is_active,
        sort_order: active.sort_order,
      })
      .eq("id", active.id);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    const { error } = await supabase.from("legal_pages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (activeId === id) setActiveId(null);
    load();
  };

  const create = async () => {
    if (!newSlug.trim() || !newTitle.trim()) return toast.error("Slug aur title chahiye");
    const slug = newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const { data, error } = await supabase
      .from("legal_pages")
      .insert({
        slug,
        title: newTitle.trim(),
        body: `<h2>${newTitle.trim()}</h2><p>Content yahan likhein.</p>`,
        sort_order: pages.length + 1,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success("Page added");
    setCreating(false);
    setNewSlug("");
    setNewTitle("");
    setActiveId((data as Page).id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Legal Pages"
        subtitle="Privacy, Terms, Refund & custom pages — content yahan se update hoga"
        action={
          <GoldButton onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
            New Page
          </GoldButton>
        }
      />

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-4">
          {/* Sidebar */}
          <GoldCard className="p-2 max-h-[70vh] overflow-y-auto">
            {pages.length === 0 && (
              <p className="text-xs text-[#f5d97a]/60 p-3">No pages yet</p>
            )}
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm mb-1 transition ${
                  activeId === p.id
                    ? "bg-[#d4af37]/20 text-[#fff8dc] border border-[#d4af37]/40"
                    : "text-[#f5d97a]/80 hover:bg-[#d4af37]/10"
                }`}
              >
                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="flex-1 truncate font-semibold">{p.title}</span>
                {!p.is_active && <EyeOff className="h-3 w-3 text-red-400" />}
              </button>
            ))}
          </GoldCard>

          {/* Editor */}
          {active ? (
            <GoldCard className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">
                    Title
                  </label>
                  <input
                    value={active.title}
                    onChange={(e) => update({ title: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">
                    Slug
                  </label>
                  <p className="mt-2 text-[11px] font-mono text-[#f5d97a]/60">{active.slug}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Hero Image URL
                  </label>
                  <input
                    value={active.hero_image_url ?? ""}
                    onChange={(e) => update({ hero_image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold flex items-center gap-1">
                    <Video className="h-3 w-3" /> Video URL (YouTube/MP4)
                  </label>
                  <input
                    value={active.video_url ?? ""}
                    onChange={(e) => update({ video_url: e.target.value })}
                    placeholder="https://youtube.com/..."
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#d4af37]/70 font-bold">
                  Body (HTML — supports h2, p, ul, strong, a)
                </label>
                <textarea
                  value={active.body}
                  onChange={(e) => update({ body: e.target.value })}
                  rows={14}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-xs font-mono resize-y"
                />
                <p className="text-[10px] text-[#f5d97a]/50 mt-1">
                  Tip: &lt;h2&gt;Heading&lt;/h2&gt; &lt;p&gt;Para&lt;/p&gt; &lt;ul&gt;&lt;li&gt;Item&lt;/li&gt;&lt;/ul&gt; &lt;strong&gt;Bold&lt;/strong&gt; &lt;a href="..."&gt;Link&lt;/a&gt;
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-xs text-[#f5d97a]">
                  <input
                    type="checkbox"
                    checked={active.is_active}
                    onChange={(e) => update({ is_active: e.target.checked })}
                  />
                  <Eye className="h-3 w-3" /> Active (visible to users)
                </label>
                <label className="flex items-center gap-2 text-xs text-[#f5d97a]">
                  Sort:
                  <input
                    type="number"
                    value={active.sort_order}
                    onChange={(e) => update({ sort_order: Number(e.target.value) })}
                    className="w-16 px-2 py-1 rounded bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-xs"
                  />
                </label>
              </div>

              <div className="flex justify-between gap-2 pt-2 border-t border-[#d4af37]/20">
                <GoldButton variant="danger" onClick={() => remove(active.id)}>
                  <Trash2 className="h-3 w-3 inline -mt-0.5 mr-1" /> Delete
                </GoldButton>
                <GoldButton onClick={save}>
                  <Save className="h-3 w-3 inline -mt-0.5 mr-1" /> Save Changes
                </GoldButton>
              </div>
            </GoldCard>
          ) : (
            <GoldCard className="p-10 text-center text-[#f5d97a]/60 text-sm">
              Select a page to edit
            </GoldCard>
          )}
        </div>
      )}

      {/* New page modal */}
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCreating(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-[#d4af37]/40 p-5 space-y-3"
            style={{ background: "linear-gradient(180deg, oklch(0.16 0.03 80), oklch(0.10 0.02 80))" }}>
            <h3 className="font-display text-lg font-bold text-[#fff8dc]">New Legal Page</h3>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Page title (e.g. Shipping Policy)"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-sm"
            />
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="slug (e.g. shipping)"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] outline-none focus:border-[#d4af37] text-sm font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <GoldButton variant="outline" onClick={() => setCreating(false)}>Cancel</GoldButton>
              <GoldButton onClick={create}>Create</GoldButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
