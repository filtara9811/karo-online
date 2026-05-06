import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Check, ChevronRight, Sparkles, Package, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IconImage } from "@/components/admin/ImageUpload";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor/services")({
  head: () => ({
    meta: [
      { title: "My Services — Vendor" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VendorServicesPage,
});

type Cat = { id: string; name: string; parent_id: string | null; type_id: string | null; is_active: boolean };
type Item = { id: string; category_id: string; name: string; image_url: string | null; icon: string | null; price_min: number | null; price_max: number | null; is_active: boolean };
type Variation = { id: string; item_id: string; name: string; price_min: number | null; price_max: number | null; is_active: boolean };
type Type = { id: string; name: string; icon: string | null; is_active: boolean };

const GOLD_BG = "radial-gradient(circle at 20% 0%, oklch(0.22 0.04 80) 0%, oklch(0.10 0.02 80) 70%)";
const GOLD_GRAD = "linear-gradient(180deg, #f5f6f8 0%, #d8dde3 35%, #a8acb3 100%)";

function VendorServicesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [types, setTypes] = useState<Type[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [vars, setVars] = useState<Variation[]>([]);
  const [mappedItems, setMappedItems] = useState<Set<string>>(new Set());
  const [mappedVars, setMappedVars] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const [path, setPath] = useState<{ type?: Type; cat?: Cat; sub?: Cat; item?: Item }>({});

  const load = async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id ?? null;
    setUserId(uid);
    if (!uid) { setLoading(false); return; }

    const [t, c, i, v, mi, mv] = await Promise.all([
      supabase.from("catalog_types").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("catalog_items").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("item_variations").select("*").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("vendor_item_mappings").select("item_id").eq("vendor_id", uid),
      supabase.from("vendor_variation_mappings").select("variation_id").eq("vendor_id", uid),
    ]);
    setTypes((t.data ?? []) as Type[]);
    setCats((c.data ?? []) as Cat[]);
    setItems((i.data ?? []) as Item[]);
    setVars((v.data ?? []) as Variation[]);
    setMappedItems(new Set((mi.data ?? []).map((x: any) => x.item_id)));
    setMappedVars(new Set((mv.data ?? []).map((x: any) => x.variation_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flashSaved = (key: string, msg: string) => {
    setSavedKey(key);
    toast.success(msg);
    window.setTimeout(() => setSavedKey((current) => (current === key ? null : current)), 1300);
  };

  const toggleItem = async (itemId: string) => {
    if (!userId) return;
    const key = `item:${itemId}`;
    setSavingKey(key);
    if (mappedItems.has(itemId)) {
      const { error } = await supabase.from("vendor_item_mappings").delete().eq("vendor_id", userId).eq("item_id", itemId);
      setSavingKey(null);
      if (error) return toast.error(error.message);
      const n = new Set(mappedItems); n.delete(itemId); setMappedItems(n);
      flashSaved(key, "Service removed");
    } else {
      const { error } = await supabase.from("vendor_item_mappings").insert({ vendor_id: userId, item_id: itemId, is_active: true });
      setSavingKey(null);
      if (error) return toast.error(error.message);
      const n = new Set(mappedItems); n.add(itemId); setMappedItems(n);
      flashSaved(key, "Service mapped successfully");
    }
  };

  const toggleVar = async (vId: string) => {
    if (!userId) return;
    const key = `var:${vId}`;
    setSavingKey(key);
    if (mappedVars.has(vId)) {
      const { error } = await supabase.from("vendor_variation_mappings").delete().eq("vendor_id", userId).eq("variation_id", vId);
      setSavingKey(null);
      if (error) return toast.error(error.message);
      const n = new Set(mappedVars); n.delete(vId); setMappedVars(n);
      flashSaved(key, "Variation removed");
    } else {
      const { error } = await supabase.from("vendor_variation_mappings").insert({ vendor_id: userId, variation_id: vId, is_active: true });
      setSavingKey(null);
      if (error) return toast.error(error.message);
      const n = new Set(mappedVars); n.add(vId); setMappedVars(n);
      flashSaved(key, "Variation saved successfully");
    }
  };

  const goBack = () => {
    if (path.item) return setPath(({ type, cat, sub }) => ({ type, cat, sub }));
    if (path.sub) return setPath(({ type, cat }) => ({ type, cat }));
    if (path.cat) return setPath(({ type }) => ({ type }));
    if (path.type) return setPath({});
    navigate({ to: "/vendor/dashboard" });
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

  // Breadcrumb
  const Crumb = (
    <div className="flex items-center gap-2 flex-wrap mb-4 text-xs">
      <button onClick={() => setPath({})} className="text-[#d8dde3]/60 hover:text-[#f5f6f8] uppercase tracking-widest font-bold">
        All
      </button>
      {(["type","cat","sub","item"] as const).map((k, i) => {
        const node = (path as any)[k];
        if (!node) return null;
        return (
          <span key={k} className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3 text-[#a8acb3]/50" />
            <button
              onClick={() => {
                const next: any = {};
                (["type","cat","sub","item"] as const).slice(0, i + 1).forEach((kk) => (next[kk] = (path as any)[kk]));
                setPath(next);
              }}
              className="text-[#d8dde3]/80 hover:text-[#f5f6f8] truncate max-w-[140px]"
            >
              {node.name}
            </button>
          </span>
        );
      })}
    </div>
  );

  // Render levels
  let body: React.ReactNode = null;
  if (!path.type) {
    body = (
      <div className="grid sm:grid-cols-2 gap-2.5">
        {types.map((t) => (
          <Tile key={t.id} title={t.name} icon={t.icon} onClick={() => setPath({ type: t })} />
        ))}
      </div>
    );
  } else if (!path.cat) {
    const list = cats.filter((c) => c.type_id === path.type!.id && !c.parent_id);
    body = list.length === 0 ? <Empty msg="No categories" /> : (
      <div className="grid sm:grid-cols-2 gap-2.5">
        {list.map((c) => <Tile key={c.id} title={c.name} onClick={() => setPath({ ...path, cat: c })} />)}
      </div>
    );
  } else if (!path.sub) {
    const list = cats.filter((c) => c.parent_id === path.cat!.id);
    body = list.length === 0 ? <Empty msg="No sub-categories" /> : (
      <div className="grid sm:grid-cols-2 gap-2.5">
        {list.map((c) => <Tile key={c.id} title={c.name} onClick={() => setPath({ ...path, sub: c })} />)}
      </div>
    );
  } else if (!path.item) {
    const list = items.filter((it) => it.category_id === path.sub!.id);
    body = list.length === 0 ? <Empty msg="No items" /> : (
      <div className="space-y-2.5">
        {list.map((it) => {
          const mapped = mappedItems.has(it.id);
          return (
            <div
              key={it.id}
              className="rounded-2xl border p-3 sm:p-4 flex items-center gap-3"
              style={{
                background: mapped
                  ? "linear-gradient(180deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))"
                  : "linear-gradient(180deg, rgba(255,253,245,0.05), rgba(255,253,245,0.02))",
                borderColor: mapped ? "rgba(212,175,55,0.7)" : "rgba(212,175,55,0.25)",
              }}
            >
              <IconImage url={it.image_url} icon={it.icon} size={48} />
              <div className="flex-1 min-w-0" onClick={() => setPath({ ...path, item: it })}>
                <p className="text-sm font-semibold text-[#f5f6f8] truncate">{it.name}</p>
                <p className="text-[11px] text-[#d8dde3]/55 truncate">
                  {it.price_min || it.price_max ? `₹${it.price_min ?? "?"} – ${it.price_max ?? "?"}` : "Tap for variations"}
                </p>
              </div>
              <button
                onClick={() => toggleItem(it.id)}
                disabled={savingKey === `item:${it.id}`}
                className={`click-feedback min-w-[86px] px-3 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition disabled:opacity-70 ${
                  mapped || savedKey === `item:${it.id}` ? "text-[#3f4750]" : "text-[#d8dde3] border border-[#a8acb3]/40"
                }`}
                style={mapped || savedKey === `item:${it.id}` ? { background: GOLD_GRAD } : undefined}
              >
                {savingKey === `item:${it.id}` ? <Loader2 className="h-3 w-3 inline mr-1 animate-spin" /> : <Check className={`h-3 w-3 inline mr-1 ${mapped || savedKey === `item:${it.id}` ? "" : "hidden"}`} />}
                {savingKey === `item:${it.id}` ? "Saving" : savedKey === `item:${it.id}` ? "Saved" : mapped ? "Mapped" : "Map"}
              </button>
            </div>
          );
        })}
      </div>
    );
  } else {
    const list = vars.filter((v) => v.item_id === path.item!.id);
    body = (
      <div className="space-y-2.5">
        <div className="text-[11px] text-[#a8acb3]/70 mb-2">
          Optionally select specific variations you offer (skip if you do all).
        </div>
        {list.length === 0 ? <Empty msg="No variations" /> : list.map((v) => {
          const mapped = mappedVars.has(v.id);
          return (
            <div
              key={v.id}
              className="rounded-2xl border p-3 sm:p-4 flex items-center gap-3"
              style={{
                background: mapped
                  ? "linear-gradient(180deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))"
                  : "linear-gradient(180deg, rgba(255,253,245,0.05), rgba(255,253,245,0.02))",
                borderColor: mapped ? "rgba(212,175,55,0.7)" : "rgba(212,175,55,0.25)",
              }}
            >
              <Sparkles className="h-5 w-5 text-[#a8acb3]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#f5f6f8] truncate">{v.name}</p>
                <p className="text-[11px] text-[#d8dde3]/55">
                  {v.price_min || v.price_max ? `₹${v.price_min ?? "?"} – ${v.price_max ?? "?"}` : ""}
                </p>
              </div>
              <button
                onClick={() => toggleVar(v.id)}
                disabled={savingKey === `var:${v.id}`}
                className={`click-feedback min-w-[86px] px-3 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition disabled:opacity-70 ${
                  mapped || savedKey === `var:${v.id}` ? "text-[#3f4750]" : "text-[#d8dde3] border border-[#a8acb3]/40"
                }`}
                style={mapped || savedKey === `var:${v.id}` ? { background: GOLD_GRAD } : undefined}
              >
                {savingKey === `var:${v.id}` ? <Loader2 className="h-3 w-3 inline mr-1 animate-spin" /> : <Check className={`h-3 w-3 inline mr-1 ${mapped || savedKey === `var:${v.id}` ? "" : "hidden"}`} />}
                {savingKey === `var:${v.id}` ? "Saving" : savedKey === `var:${v.id}` ? "Saved" : mapped ? "On" : "Select"}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: GOLD_BG }}>
      <header className="sticky top-0 z-20 px-4 sm:px-6 py-4 border-b border-[#a8acb3]/20 backdrop-blur-xl bg-black/20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={goBack}
            aria-label="Back"
            className="click-feedback h-10 w-10 grid place-items-center rounded-full border border-[#a8acb3]/30 text-[#f5f6f8] bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold" style={{ background: GOLD_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              My Services
            </h1>
            <p className="text-xs text-[#d8dde3]/60 mt-1 truncate">
              Apne services map kariye — customers aapko in services par dhoondhenge.
            </p>
          </div>
        </div>
      </header>
      <main className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
        {Crumb}
        {body}
      </main>
    </div>
  );
}

function Tile({ title, icon, onClick }: { title: string; icon?: string | null; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border p-3 sm:p-4 flex items-center gap-3 hover:border-[#a8acb3]/60 transition text-left"
      style={{
        background: "linear-gradient(180deg, rgba(255,253,245,0.05), rgba(255,253,245,0.02))",
        borderColor: "rgba(212,175,55,0.25)",
      }}
    >
      <IconImage icon={icon} size={40} />
      <p className="flex-1 text-sm font-semibold text-[#f5f6f8] truncate">{title}</p>
      <ChevronRight className="h-4 w-4 text-[#a8acb3]/60" />
    </button>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="text-center py-16">
      <Package className="h-10 w-10 text-[#a8acb3]/40 mx-auto mb-3" />
      <p className="text-sm text-[#d8dde3]/60">{msg}</p>
    </div>
  );
}
