import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Loader2, ImagePlus, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { ExtraLink } from "@/components/landing/landing-shared";
import { SheetShell } from "./SheetShell";

type Product = ExtraLink;

const blank = (): Product => ({
  id: `shop-${Date.now()}`,
  label: "",
  url: "",
  price: "",
  image: null,
  enabled: true,
  category: "shop",
});

/** Product editor for the merchant landing page shop rail. */
export function LandingProductsSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [links, setLinks] = useState<ExtraLink[]>([]);
  const [draft, setDraft] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("merchant_link_settings" as never)
        .select("extra_links")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const d = data as { extra_links?: ExtraLink[] } | null;
      setLinks(Array.isArray(d?.extra_links) ? d!.extra_links! : []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, user?.id]);

  const persist = useCallback(async (next: ExtraLink[]) => {
    setSaving(true);
    setLinks(next);
    const { error } = await supabase.rpc("upsert_merchant_link_settings" as never, {
      _payload: { extra_links: next },
    } as never);
    setSaving(false);
    if (error) { toast.error("Save nahi hua: " + error.message); return false; }
    onSaved?.();
    return true;
  }, [onSaved]);

  const products = links.filter((l) => (l.category ?? "other") === "shop" && l.id.startsWith("shop-"));

  const save = async () => {
    if (!draft) return;
    if (draft.label.trim().length < 2) { toast.error("Product ka naam likhein"); return; }
    const item: Product = { ...draft, label: draft.label.trim(), category: "shop", enabled: true, url: draft.url || " " };
    const exists = links.some((l) => l.id === item.id);
    const ok = await persist(exists ? links.map((l) => (l.id === item.id ? item : l)) : [...links, item]);
    if (ok) { setDraft(null); toast.success("Product saved"); }
  };

  const remove = async (id: string) => {
    const ok = await persist(links.filter((l) => l.id !== id));
    if (ok) toast.success("Product hata diya");
  };

  const onImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) { toast.error("Image bahut badi hai (max 6 MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => (d ? { ...d, image: String(reader.result || "") } : d));
    reader.readAsDataURL(f);
  };

  return (
    <SheetShell
      section="products"
      open={open}
      onClose={onClose}
      title="Products"
      subtitle="Landing page ke shop rail me dikhne wale products"
      footer={
        draft ? (
          <div className="flex gap-2">
            <button
              onClick={() => setDraft(null)}
              className="h-11 flex-1 rounded-2xl border border-black/10 text-[13px] font-bold text-slate-600 active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="h-11 flex-[1.4] rounded-2xl bg-amber-500 text-[13px] font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save product"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDraft(blank())}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 text-[13px] font-extrabold text-white active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Naya product add karein
          </button>
        )
      }
    >
      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-amber-600" /></div>
      ) : draft ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative grid h-36 w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-amber-300 bg-amber-50/60"
          >
            {draft.image ? (
              <img src={draft.image} alt={draft.label || "Product"} className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-amber-700">
                <ImagePlus className="h-6 w-6" />
                <span className="text-[11px] font-bold">Product photo</span>
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />
          <Field label="Product name">
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value.slice(0, 60) })}
              placeholder="Cotton saree"
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            />
          </Field>
          <Field label="Price (optional)">
            <input
              value={draft.price ?? ""}
              onChange={(e) => setDraft({ ...draft, price: e.target.value.slice(0, 20) })}
              placeholder="₹499"
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            />
          </Field>
          <Field label="Link (optional)">
            <input
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://…"
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
            />
          </Field>
        </div>
      ) : products.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 py-10 text-center">
          <Package className="h-6 w-6 text-amber-600" />
          <p className="text-[12px] font-bold text-slate-700">Abhi koi product nahi hai</p>
          <p className="px-6 text-[11px] text-slate-500">Photo, naam aur price add karein — customer ko landing page par dikhega.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-black/10 p-2"
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-amber-50">
                {p.image ? (
                  <img src={p.image} alt={p.label} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-amber-600"><Package className="h-4 w-4" /></span>
                )}
              </span>
              <button onClick={() => setDraft(p)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[13px] font-bold text-slate-900">{p.label}</p>
                <p className="truncate text-[11px] text-slate-500">{p.price || "Price not set"}</p>
              </button>
              <button
                onClick={() => remove(p.id)}
                aria-label="Remove product"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600 active:scale-90"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </SheetShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-amber-400">
        {children}
      </div>
    </label>
  );
}
