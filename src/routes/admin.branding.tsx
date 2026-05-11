import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout, GoldCard, GoldButton, PageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/branding")({
  head: () => ({
    meta: [
      { title: "Branding Studio — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BrandingPage,
});

type Scope = "customer" | "vendor" | "admin";

type Tokens = Record<string, string>;
type Fonts = { display?: string; body?: string };
type Assets = { logo_light?: string; logo_dark?: string; favicon?: string; splash?: string; app_name?: string; tagline?: string };

type ThemeRow = {
  id: string;
  scope: Scope;
  preset_name: string | null;
  tokens: Tokens;
  fonts: Fonts;
  icons_pack: string;
  assets: Assets;
  radius_scale: number;
  shadow_intensity: number;
  animation_speed: number;
};

const COLOR_KEYS = [
  "primary", "background", "foreground", "accent", "secondary",
  "muted", "success", "danger", "border",
];

const FONT_OPTIONS = [
  "Inter", "Cormorant Garamond", "Playfair Display", "Poppins",
  "Noto Sans Devanagari", "Roboto", "Montserrat", "Lora", "Work Sans",
];
const ICON_PACKS = ["lucide", "heroicons", "phosphor"];
const PRESETS: { name: string; tokens: Tokens; fonts: Fonts }[] = [
  { name: "Royal Gold", tokens: { primary: "#D4AF37", background: "#FFFFFF", foreground: "#1a1208", accent: "#B8860B" }, fonts: { display: "Cormorant Garamond", body: "Inter" } },
  { name: "Sapphire Silver", tokens: { primary: "#2563EB", background: "#FFFFFF", foreground: "#0f172a", accent: "#6B7280" }, fonts: { display: "Playfair Display", body: "Inter" } },
  { name: "Midnight", tokens: { primary: "#F5D97A", background: "#0a0a0a", foreground: "#fafafa", accent: "#a78bfa" }, fonts: { display: "Cormorant Garamond", body: "Inter" } },
  { name: "Emerald Cream", tokens: { primary: "#059669", background: "#FFFBEB", foreground: "#1c1917", accent: "#D97706" }, fonts: { display: "Lora", body: "Work Sans" } },
];

function BrandingPage() {
  const [scope, setScope] = useState<Scope>("customer");
  const [row, setRow] = useState<ThemeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("theme_settings").select("*")
      .eq("scope", scope).eq("is_active", true).maybeSingle();
    setRow(data as ThemeRow | null);
    setLoading(false);
  };
  useEffect(() => { load(); }, [scope]);

  const setTok = (k: string, v: string) => row && setRow({ ...row, tokens: { ...row.tokens, [k]: v } });
  const setFont = (k: keyof Fonts, v: string) => row && setRow({ ...row, fonts: { ...row.fonts, [k]: v } });
  const setAsset = (k: keyof Assets, v: string) => row && setRow({ ...row, assets: { ...row.assets, [k]: v } });

  const applyPreset = (name: string) => {
    const p = PRESETS.find(x => x.name === name); if (!p || !row) return;
    setRow({ ...row, preset_name: p.name, tokens: { ...row.tokens, ...p.tokens }, fonts: { ...row.fonts, ...p.fonts } });
  };

  const save = async () => {
    if (!row) return;
    setSaving(true); setMsg(null);
    const { error } = await (supabase as any).from("theme_settings").update({
      tokens: row.tokens, fonts: row.fonts, assets: row.assets,
      icons_pack: row.icons_pack, preset_name: row.preset_name,
      radius_scale: row.radius_scale, shadow_intensity: row.shadow_intensity, animation_speed: row.animation_speed,
    }).eq("id", row.id);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Saved ✓ — refresh app to see changes");
    setTimeout(() => setMsg(null), 3500);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Branding Studio"
        subtitle="Colors, fonts, icons, logos — pure app ka look apne haath me"
        action={<GoldButton onClick={save} disabled={saving || !row}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : <Save className="h-3 w-3 inline mr-1" />}
          Save Theme
        </GoldButton>}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["customer", "vendor", "admin"] as Scope[]).map(s => (
          <button key={s} onClick={() => setScope(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition ${
              scope === s ? "text-[#1a1208]" : "text-[#f5d97a] border border-[#d4af37]/40 hover:bg-[#d4af37]/10"
            }`}
            style={scope === s ? { background: "linear-gradient(180deg,#fff8dc,#f5d97a,#d4af37)" } : undefined}
          >{s} App</button>
        ))}
      </div>

      {msg && <div className="mb-4 px-4 py-2 rounded-lg text-xs text-[#fff8dc] border border-[#d4af37]/40 bg-[#d4af37]/10">{msg}</div>}

      {loading || !row ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Presets */}
          <GoldCard className="p-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3 text-[#fff8dc] font-bold text-sm"><Palette className="h-4 w-4 text-[#d4af37]" /> Presets</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    row.preset_name === p.name ? "text-[#1a1208] border-transparent" : "text-[#f5d97a] border-[#d4af37]/40 hover:bg-[#d4af37]/10"
                  }`}
                  style={row.preset_name === p.name ? { background: p.tokens.primary } : undefined}
                >{p.name}</button>
              ))}
            </div>
          </GoldCard>

          {/* Colors */}
          <GoldCard className="p-4">
            <div className="text-[#fff8dc] font-bold text-sm mb-3">Colors</div>
            <div className="grid grid-cols-2 gap-3">
              {COLOR_KEYS.map(k => (
                <div key={k}>
                  <label className="text-[10px] uppercase tracking-widest text-[#d4af37]/70 mb-1 block">{k}</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={row.tokens[k] ?? "#000000"} onChange={(e) => setTok(k, e.target.value)}
                      className="h-9 w-12 rounded cursor-pointer bg-transparent border border-[#d4af37]/30" />
                    <input type="text" value={row.tokens[k] ?? ""} onChange={(e) => setTok(k, e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-md bg-black/40 border border-[#d4af37]/25 text-[#fff8dc] text-xs font-mono" />
                  </div>
                </div>
              ))}
            </div>
          </GoldCard>

          {/* Typography & Icons */}
          <GoldCard className="p-4">
            <div className="text-[#fff8dc] font-bold text-sm mb-3">Typography & Icons</div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#d4af37]/70 mb-1 block">Display Font</label>
                <select value={row.fonts.display ?? ""} onChange={(e) => setFont("display", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-sm">
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#d4af37]/70 mb-1 block">Body Font</label>
                <select value={row.fonts.body ?? ""} onChange={(e) => setFont("body", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-sm">
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#d4af37]/70 mb-1 block">Icons Pack</label>
                <select value={row.icons_pack} onChange={(e) => setRow({ ...row, icons_pack: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-sm">
                  {ICON_PACKS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </GoldCard>

          {/* Brand Assets */}
          <GoldCard className="p-4">
            <div className="text-[#fff8dc] font-bold text-sm mb-3">Brand Assets</div>
            <div className="space-y-2">
              {(["app_name","tagline","logo_light","logo_dark","favicon","splash"] as (keyof Assets)[]).map(k => (
                <div key={k}>
                  <label className="text-[10px] uppercase tracking-widest text-[#d4af37]/70 mb-1 block">{k.replace(/_/g," ")}</label>
                  <input value={row.assets[k] ?? ""} onChange={(e) => setAsset(k, e.target.value)}
                    placeholder={k.includes("logo") || k === "favicon" || k === "splash" ? "https://… image url" : ""}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[#d4af37]/30 text-[#fff8dc] text-sm" />
                </div>
              ))}
            </div>
          </GoldCard>

          {/* Sliders */}
          <GoldCard className="p-4">
            <div className="text-[#fff8dc] font-bold text-sm mb-3">Surface Tuning</div>
            {([
              ["radius_scale","Radius scale"],
              ["shadow_intensity","Shadow intensity"],
              ["animation_speed","Animation speed"],
            ] as [keyof ThemeRow, string][]).map(([k, l]) => (
              <div key={k} className="mb-3">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#d4af37]/70 mb-1">
                  <span>{l}</span><span>{(row[k] as number).toFixed(2)}</span>
                </div>
                <input type="range" min={0.5} max={2} step={0.05} value={row[k] as number}
                  onChange={(e) => setRow({ ...row, [k]: Number(e.target.value) } as ThemeRow)}
                  className="w-full accent-[#d4af37]" />
              </div>
            ))}
          </GoldCard>

          {/* Live Preview */}
          <GoldCard className="p-4 lg:col-span-2">
            <div className="text-[#fff8dc] font-bold text-sm mb-3">Live Preview ({scope})</div>
            <div className="rounded-xl p-6 border" style={{
              background: row.tokens.background ?? "#fff",
              color: row.tokens.foreground ?? "#000",
              fontFamily: row.fonts.body ?? "Inter",
              borderColor: row.tokens.border ?? "rgba(0,0,0,0.1)",
            }}>
              <h3 style={{ fontFamily: row.fonts.display, color: row.tokens.primary }} className="text-2xl font-bold mb-2">
                {row.assets.app_name || "Karo Online"}
              </h3>
              <p className="text-sm opacity-70 mb-4">{row.assets.tagline || "Premium services & vendor marketplace"}</p>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg font-bold text-white" style={{ background: row.tokens.primary }}>Primary CTA</button>
                <button className="px-4 py-2 rounded-lg font-bold border" style={{ borderColor: row.tokens.primary, color: row.tokens.primary }}>Outline</button>
                <button className="px-4 py-2 rounded-lg font-bold text-white" style={{ background: row.tokens.accent ?? row.tokens.primary }}>Accent</button>
              </div>
            </div>
          </GoldCard>
        </div>
      )}
    </AdminLayout>
  );
}
