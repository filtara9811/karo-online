import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminLayout, PageHeader, GoldButton, GoldCard } from "@/components/admin/AdminLayout";
import { SmartMediaPicker } from "@/components/SmartMediaPicker";

type Slide = {
  id: string;
  position: number;
  title: string;
  subtitle: string;
  media_type: "image" | "video" | "lottie" | "animation";
  media_url: string;
  poster_url: string | null;
  cta_label: string;
  bg_color: string | null;
  text_color: string | null;
  audience: "customer" | "vendor" | "all";
  is_active: boolean;
  skip_allowed: boolean;
};

export const Route = createFileRoute("/admin/onboarding")({
  component: () => (
    <AdminLayout>
      <OnboardingAdmin />
    </AdminLayout>
  ),
});

function OnboardingAdmin() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("onboarding_slides" as never)
      .select("*")
      .order("position", { ascending: true });
    setSlides(((data as unknown) as Slide[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    const nextPos = (slides[slides.length - 1]?.position ?? -1) + 1;
    const { error } = await supabase.from("onboarding_slides" as never).insert({
      position: nextPos,
      title: "Welcome to Karo Online",
      subtitle: "India's premium hyperlocal marketplace",
      media_type: "image",
      media_url: "",
      cta_label: "Next",
      audience: "customer",
      is_active: true,
      skip_allowed: true,
    } as never);
    if (error) toast.error(error.message);
    else load();
  };

  const update = async (id: string, patch: Partial<Slide>) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const persist = async (slide: Slide) => {
    setSaving(slide.id);
    const { id, ...rest } = slide;
    const { error } = await supabase
      .from("onboarding_slides" as never)
      .update(rest as never)
      .eq("id", id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success("Slide saved");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    const { error } = await supabase.from("onboarding_slides" as never).delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const move = async (slide: Slide, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === slide.id);
    const swap = slides[idx + dir];
    if (!swap) return;
    await supabase.from("onboarding_slides" as never).update({ position: swap.position } as never).eq("id", slide.id);
    await supabase.from("onboarding_slides" as never).update({ position: slide.position } as never).eq("id", swap.id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Customer Onboarding Screens"
        subtitle="Splash / intro slides shown before the customer logs in. Drag-style ordering, image / video / Lottie animation supported."
        action={
          <GoldButton onClick={add}>
            <Plus className="h-4 w-4" /> Add Slide
          </GoldButton>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 text-[#f5d97a]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : slides.length === 0 ? (
        <GoldCard>
          <p className="text-[#f5d97a]/80 text-sm">
            Abhi koi slide nahi hai. "Add Slide" pe click karke pehla welcome screen banaiye.
          </p>
        </GoldCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {slides.map((slide, i) => (
            <GoldCard key={slide.id}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="text-[#fff8dc] font-semibold">
                  Slide #{i + 1}
                  <span className="ml-2 text-xs text-[#f5d97a]/60">({slide.audience})</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => move(slide, -1)}
                    disabled={i === 0}
                    className="h-7 w-7 grid place-items-center rounded bg-black/40 text-[#f5d97a] hover:bg-[#d4af37]/20 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(slide, 1)}
                    disabled={i === slides.length - 1}
                    className="h-7 w-7 grid place-items-center rounded bg-black/40 text-[#f5d97a] hover:bg-[#d4af37]/20 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => update(slide.id, { is_active: !slide.is_active })}
                    className="h-7 w-7 grid place-items-center rounded bg-black/40 text-[#f5d97a] hover:bg-[#d4af37]/20"
                    title={slide.is_active ? "Active" : "Hidden"}
                  >
                    {slide.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => remove(slide.id)}
                    className="h-7 w-7 grid place-items-center rounded bg-red-900/30 text-red-300 hover:bg-red-900/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs text-[#f5d97a]/70 mb-1">Title</label>
                  <input
                    value={slide.title}
                    onChange={(e) => update(slide.id, { title: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#f5d97a]/70 mb-1">Subtitle</label>
                  <textarea
                    value={slide.subtitle}
                    onChange={(e) => update(slide.id, { subtitle: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-xs text-[#f5d97a]/70 mb-1">Media Type</label>
                    <select
                      value={slide.media_type}
                      onChange={(e) => update(slide.id, { media_type: e.target.value as Slide["media_type"] })}
                      className="w-full px-2 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video (mp4/url)</option>
                      <option value="lottie">Lottie JSON</option>
                      <option value="animation">Animation GIF</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-[#f5d97a]/70 mb-1">CTA Label</label>
                    <input
                      value={slide.cta_label}
                      onChange={(e) => update(slide.id, { cta_label: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-[#f5d97a]/70 mb-1">Audience</label>
                    <select
                      value={slide.audience}
                      onChange={(e) => update(slide.id, { audience: e.target.value as Slide["audience"] })}
                      className="w-full px-2 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40"
                    >
                      <option value="customer">Customer</option>
                      <option value="vendor">Vendor</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                </div>

                {slide.media_type === "image" || slide.media_type === "animation" ? (
                  <SmartMediaPicker
                    value={slide.media_url}
                    onChange={(url) => update(slide.id, { media_url: url ?? "" })}
                    label="Media (upload or paste URL)"
                    folder="onboarding"
                  />
                ) : (
                  <div>
                    <label className="block text-xs text-[#f5d97a]/70 mb-1">
                      {slide.media_type === "video" ? "Video URL (.mp4 / YouTube)" : "Lottie JSON URL"}
                    </label>
                    <input
                      value={slide.media_url}
                      onChange={(e) => update(slide.id, { media_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded bg-[#fffdf5] text-[#1a1208] text-sm border border-[#d4af37]/40"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs text-[#f5d97a]/80">
                  <input
                    type="checkbox"
                    checked={slide.skip_allowed}
                    onChange={(e) => update(slide.id, { skip_allowed: e.target.checked })}
                  />
                  Allow user to skip this slide
                </label>

                <div className="flex justify-end pt-1">
                  <GoldButton onClick={() => persist(slide)} disabled={saving === slide.id}>
                    {saving === slide.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </GoldButton>
                </div>
              </div>
            </GoldCard>
          ))}
        </div>
      )}
    </div>
  );
}
