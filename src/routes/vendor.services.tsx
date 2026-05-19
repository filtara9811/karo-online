import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronRight, Sparkles, Package, ArrowLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { IconImage } from "@/components/admin/ImageUpload";
import { toast } from "sonner";
import { VendorAuthGate } from "@/components/VendorAuthGate";

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

const GOLD_BG = "radial-gradient(circle at 20% 0%, oklch(0.22 0.04 80) 0%, oklch(0.10 0.02 80) 70%)";
const GOLD_GRAD = "linear-gradient(180deg, #f5f6f8 0%, #d8dde3 35%, #a8acb3 100%)";

function VendorServicesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [types, setTypes] = useState<Type[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [mappedItems, setMappedItems] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Stack of selected nodes — each entry opens its own bottom sheet
  const [typeSel, setTypeSel] = useState<Type | null>(null);
  const [catSel, setCatSel] = useState<Cat | null>(null);
  const [subSel, setSubSel] = useState<Cat | null>(null);

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
      supabase.from("vendor_item_mappings").select("item_id").eq("vendor_id", uid),
    ]);
    setTypes((t.data ?? []) as Type[]);
    setCats((c.data ?? []) as Cat[]);
    setItems((i.data ?? []) as Item[]);
    setMappedItems(new Set((mi.data ?? []).map((x: { item_id: string }) => x.item_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleItem = async (itemId: string) => {
    if (!userId) return;
    const key = `item:${itemId}`;
    setSavingKey(key);
    if (mappedItems.has(itemId)) {
      const { error } = await supabase.from("vendor_item_mappings").delete().eq("vendor_id", userId).eq("item_id", itemId);
      setSavingKey(null);
      if (error) return toast.error(error.message);
      const n = new Set(mappedItems); n.delete(itemId); setMappedItems(n);
      toast.success("Service removed");
    } else {
      const { error } = await supabase.from("vendor_item_mappings").insert({ vendor_id: userId, item_id: itemId, is_active: true });
      setSavingKey(null);
      if (error) return toast.error(error.message);
      const n = new Set(mappedItems); n.add(itemId); setMappedItems(n);
      toast.success("Linked — leads start aane lagenge");
    }
  };

  const rootCatsForType = useMemo(
    () => (typeSel ? cats.filter((c) => c.type_id === typeSel.id && !c.parent_id) : []),
    [cats, typeSel],
  );
  const subCatsForCat = useMemo(
    () => (catSel ? cats.filter((c) => c.parent_id === catSel.id) : []),
    [cats, catSel],
  );
  const itemsForSub = useMemo(
    () => (subSel ? items.filter((it) => it.category_id === subSel.id) : []),
    [items, subSel],
  );

  // Mapped-count helpers for badge previews on each tile
  const mappedCountForType = (t: Type) => {
    const rootIds = cats.filter((c) => c.type_id === t.id && !c.parent_id).map((c) => c.id);
    const subIds = cats.filter((c) => c.parent_id && rootIds.includes(c.parent_id!)).map((c) => c.id);
    const allCatIds = new Set([...rootIds, ...subIds]);
    return items.filter((it) => allCatIds.has(it.category_id) && mappedItems.has(it.id)).length;
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

  return (
    <div className="min-h-screen" style={{ background: GOLD_BG }}>
      <header className="sticky top-0 z-20 px-4 sm:px-6 py-4 border-b border-[#a8acb3]/20 backdrop-blur-xl bg-black/20">
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
            <p className="text-xs text-[#d8dde3]/60 mt-1 truncate">
              Type chunein → category → sub-category → toggle ON karke leads paaiye.
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
        <div className="text-[10px] text-[#d8dde3]/55 uppercase tracking-[0.3em] font-bold mb-3">All</div>
        <div className="space-y-3">
          {types.map((t) => (
            <TypeTile
              key={t.id}
              title={t.name}
              icon={t.icon}
              count={mappedCountForType(t)}
              onClick={() => setTypeSel(t)}
            />
          ))}
        </div>
      </main>

      {/* ─── SHEET 1: Categories under type ─── */}
      <BottomSheet
        open={!!typeSel}
        title={typeSel?.name ?? ""}
        subtitle="Category chunein"
        z={50}
        onClose={() => { setTypeSel(null); setCatSel(null); setSubSel(null); }}
      >
        {rootCatsForType.length === 0 ? (
          <Empty msg="Koi category nahi mili" />
        ) : (
          <div className="space-y-2.5">
            {rootCatsForType.map((c) => (
              <RowTile key={c.id} title={c.name} onClick={() => setCatSel(c)} />
            ))}
          </div>
        )}
      </BottomSheet>

      {/* ─── SHEET 2: Sub-categories under category ─── */}
      <BottomSheet
        open={!!catSel}
        title={catSel?.name ?? ""}
        subtitle="Sub-category chunein"
        z={60}
        onClose={() => { setCatSel(null); setSubSel(null); }}
      >
        {subCatsForCat.length === 0 ? (
          <Empty msg="Koi sub-category nahi" />
        ) : (
          <div className="space-y-2.5">
            {subCatsForCat.map((c) => (
              <RowTile key={c.id} title={c.name} onClick={() => setSubSel(c)} />
            ))}
          </div>
        )}
      </BottomSheet>

      {/* ─── SHEET 3: Items with ON/OFF toggle ─── */}
      <BottomSheet
        open={!!subSel}
        title={subSel?.name ?? ""}
        subtitle="ON karein wo services jo aap dete hain"
        z={70}
        onClose={() => setSubSel(null)}
      >
        {itemsForSub.length === 0 ? (
          <Empty msg="Koi item nahi" />
        ) : (
          <div className="space-y-2.5">
            {itemsForSub.map((it) => {
              const on = mappedItems.has(it.id);
              const saving = savingKey === `item:${it.id}`;
              return (
                <div
                  key={it.id}
                  className="rounded-2xl border p-3 flex items-center gap-3"
                  style={{
                    background: on
                      ? "linear-gradient(180deg, rgba(34,197,94,0.16), rgba(34,197,94,0.05))"
                      : "linear-gradient(180deg, rgba(255,253,245,0.05), rgba(255,253,245,0.02))",
                    borderColor: on ? "rgba(34,197,94,0.6)" : "rgba(212,175,55,0.25)",
                  }}
                >
                  <IconImage url={it.image_url} icon={it.icon} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#f5f6f8] truncate">{it.name}</p>
                    <p className="text-[11px] text-[#d8dde3]/55 truncate">
                      {it.price_min || it.price_max ? `₹${it.price_min ?? "?"} – ${it.price_max ?? "?"}` : (on ? "Linked — leads ON" : "Tap toggle to link")}
                    </p>
                  </div>
                  <ToggleSwitch
                    on={on}
                    busy={saving}
                    onChange={() => toggleItem(it.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI bits
// ─────────────────────────────────────────────────────────────────────────────

function TypeTile({ title, icon, count, onClick }: { title: string; icon?: string | null; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="click-feedback w-full rounded-2xl border p-4 flex items-center gap-3 hover:border-[#a8acb3]/60 transition text-left"
      style={{
        background: "linear-gradient(180deg, rgba(255,253,245,0.05), rgba(255,253,245,0.02))",
        borderColor: "rgba(212,175,55,0.25)",
      }}
    >
      <IconImage icon={icon} size={44} />
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-[#f5f6f8] truncate">{title}</p>
        {count > 0 && (
          <p className="text-[11px] text-emerald-400/90 font-bold">{count} linked</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-[#a8acb3]/60" />
    </button>
  );
}

function RowTile({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="click-feedback w-full rounded-2xl border p-3.5 flex items-center gap-3 hover:border-[#a8acb3]/60 transition text-left"
      style={{
        background: "linear-gradient(180deg, rgba(255,253,245,0.05), rgba(255,253,245,0.02))",
        borderColor: "rgba(212,175,55,0.25)",
      }}
    >
      <Sparkles className="h-4 w-4 text-[#d4af37]/80" />
      <p className="flex-1 text-sm font-semibold text-[#f5f6f8] truncate">{title}</p>
      <ChevronRight className="h-4 w-4 text-[#a8acb3]/60" />
    </button>
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

function BottomSheet({
  open,
  title,
  subtitle,
  z,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  z: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: z }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed inset-x-0 bottom-0 max-h-[80vh] rounded-t-[28px] overflow-hidden flex flex-col"
            style={{
              zIndex: z + 1,
              background: "linear-gradient(180deg, #1a1208 0%, #0f0a04 100%)",
              borderTop: "1px solid rgba(212,175,55,0.3)",
              boxShadow: "0 -24px 60px -10px rgba(0,0,0,0.7)",
            }}
          >
            {/* Drag handle */}
            <div className="pt-2.5 pb-1 grid place-items-center">
              <span className="block h-1.5 w-12 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-70" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 pt-2 flex items-start gap-3 border-b border-[#d4af37]/15">
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-[#f5f6f8] truncate">{title}</h3>
                {subtitle && <p className="text-[11px] text-[#d8dde3]/60 mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="click-feedback h-8 w-8 rounded-full grid place-items-center border border-[#a8acb3]/30 text-[#f5f6f8] bg-white/5 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="text-center py-12">
      <Package className="h-10 w-10 text-[#a8acb3]/40 mx-auto mb-3" />
      <p className="text-sm text-[#d8dde3]/60">{msg}</p>
    </div>
  );
}
